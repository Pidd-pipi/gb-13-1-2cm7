import { Response } from 'express';
import { AppDataSource } from '../config/database';
import { Book } from '../entities/Book';
import { Message } from '../entities/Message';
import { Transaction } from '../entities/Transaction';
import { Review } from '../entities/Review';
import { User } from '../entities/User';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

/**
 * 查询聊过这本书的同学（与卖家围绕该书互发过消息的用户，去重）。
 * 卖家标记售出时只能从这些人里选定买家。
 */
export const getBookBuyerCandidates = async (req: AuthenticatedRequest, res: Response) => {
  const { bookId } = req.params;

  const bookRepository = AppDataSource.getRepository(Book);
  const book = await bookRepository.findOne({ where: { id: bookId } });

  if (!book) {
    return res.status(404).json({ message: '书籍不存在' });
  }

  if (book.sellerId !== req.userId) {
    return res.status(403).json({ message: '无权限操作' });
  }

  const messageRepository = AppDataSource.getRepository(Message);
  const rows: { userId: string }[] = await messageRepository
    .createQueryBuilder('message')
    .select('DISTINCT CASE WHEN message.senderId = :sellerId THEN message.receiverId ELSE message.senderId END', 'userId')
    .addSelect('MAX(message.createdAt)', 'lastMessageAt')
    .where('message.bookId = :bookId', { bookId })
    .andWhere('(message.senderId = :sellerId OR message.receiverId = :sellerId)', { sellerId: req.userId })
    .andWhere('NOT (message.senderId = :sellerId AND message.receiverId = :sellerId)')
    .groupBy('userId')
    .orderBy('lastMessageAt', 'DESC')
    .getRawMany();

  const candidateIds = rows.map(r => r.userId).filter(id => id && id !== req.userId);

  const users = candidateIds.length
    ? await AppDataSource.getRepository(User).find({
        where: candidateIds.map(id => ({ id })),
        select: ['id', 'name', 'avatarUrl', 'department'],
      })
    : [];

  res.json(users);
};

/**
 * 卖家标记售出：从聊过这本书的同学里选定买家，创建交易并把书置为已售出。
 */
export const markBookSold = async (req: AuthenticatedRequest, res: Response) => {
  const { bookId } = req.params;
  const { buyerId } = req.body;

  if (!buyerId) {
    return res.status(400).json({ message: '请选择买家' });
  }

  if (buyerId === req.userId) {
    return res.status(400).json({ message: '买家不能是卖家自己' });
  }

  const bookRepository = AppDataSource.getRepository(Book);
  const book = await bookRepository.findOne({ where: { id: bookId } });

  if (!book) {
    return res.status(404).json({ message: '书籍不存在' });
  }

  if (book.sellerId !== req.userId) {
    return res.status(403).json({ message: '无权限操作' });
  }

  if (book.status === 'sold') {
    return res.status(400).json({ message: '该书已成交' });
  }

  // 买家必须与卖家围绕这本书聊过
  const messageRepository = AppDataSource.getRepository(Message);
  const chatted = await messageRepository
    .createQueryBuilder('message')
    .where('message.bookId = :bookId', { bookId })
    .andWhere(
      '((message.senderId = :sellerId AND message.receiverId = :buyerId) OR (message.senderId = :buyerId AND message.receiverId = :sellerId))',
      { sellerId: req.userId, buyerId }
    )
    .getOne();

  if (!chatted) {
    return res.status(400).json({ message: '只能从聊过这本书的同学中选择买家' });
  }

  const buyer = await AppDataSource.getRepository(User).findOne({ where: { id: buyerId }, select: ['id'] });
  if (!buyer) {
    return res.status(404).json({ message: '买家不存在' });
  }

  const transactionRepository = AppDataSource.getRepository(Transaction);
  const existed = await transactionRepository.findOne({ where: { bookId } });
  if (existed) {
    return res.status(400).json({ message: '该书已存在成交记录' });
  }

  try {
    const transaction = await AppDataSource.transaction(async manager => {
      const tx = manager.create(Transaction, {
        bookId,
        sellerId: req.userId!,
        buyerId,
        status: 'sold',
        completedAt: null,
      });
      await manager.save(tx);

      book.status = 'sold';
      await manager.save(book);

      return tx;
    });

    res.status(201).json({ message: '已标记售出，等待买家确认收货', transaction });
  } catch (error: any) {
    // 唯一键冲突等并发场景
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: '该书已存在成交记录' });
    }
    console.error(error);
    res.status(500).json({ message: '操作失败' });
  }
};

/**
 * 买家确认收货。确认后交易完成，双方各获得一次评价机会。
 */
export const confirmTransaction = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const transactionRepository = AppDataSource.getRepository(Transaction);
  const transaction = await transactionRepository.findOne({ where: { id } });

  if (!transaction) {
    return res.status(404).json({ message: '交易不存在' });
  }

  if (transaction.buyerId !== req.userId) {
    return res.status(403).json({ message: '只有买家可以确认收货' });
  }

  if (transaction.status === 'completed') {
    return res.status(400).json({ message: '已确认收货，请勿重复操作' });
  }

  transaction.status = 'completed';
  transaction.completedAt = new Date();
  await transactionRepository.save(transaction);

  res.json({ message: '已确认收货，快去评价吧', transaction });
};

interface TxRow {
  id: string;
  status: string;
  completedAt: Date | null;
  createdAt: Date;
  bookId: string;
  sellerId: string;
  buyerId: string;
  bookTitle: string;
  bookPrice: string;
  bookImage: string;
  sellerName: string | null;
  sellerAvatar: string | null;
  buyerName: string | null;
  buyerAvatar: string | null;
  sellerReviewType: string | null;
  buyerReviewType: string | null;
}

/**
 * 我的交易（买家或卖家身份），附带双方评价状态。
 */
export const getMyTransactions = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;

  const rows: TxRow[] = await AppDataSource.getRepository(Transaction)
    .createQueryBuilder('tx')
    .innerJoin('tx.book', 'book')
    .innerJoin('tx.seller', 'seller')
    .innerJoin('tx.buyer', 'buyer')
    .leftJoin(Review, 'sr', 'sr.transactionId = tx.id AND sr.reviewerId = tx.sellerId')
    .leftJoin(Review, 'br', 'br.transactionId = tx.id AND br.reviewerId = tx.buyerId')
    .where('tx.sellerId = :userId OR tx.buyerId = :userId', { userId })
    .orderBy('tx.createdAt', 'DESC')
    .select([
      'tx.id AS id',
      'tx.status AS status',
      'tx.completedAt AS completedAt',
      'tx.createdAt AS createdAt',
      'tx.bookId AS bookId',
      'tx.sellerId AS sellerId',
      'tx.buyerId AS buyerId',
      'book.title AS bookTitle',
      'book.price AS bookPrice',
      'book.images AS bookImage',
      'seller.name AS sellerName',
      'seller.avatarUrl AS sellerAvatar',
      'buyer.name AS buyerName',
      'buyer.avatarUrl AS buyerAvatar',
      'sr.type AS sellerReviewType',
      'br.type AS buyerReviewType',
    ])
    .getRawMany();

  const transactions = rows.map(row => ({
    id: row.id,
    status: row.status,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    bookId: row.bookId,
    sellerId: row.sellerId,
    buyerId: row.buyerId,
    role: row.sellerId === userId ? ('seller' as const) : ('buyer' as const),
    book: {
      id: row.bookId,
      title: row.bookTitle,
      price: row.bookPrice,
      cover: parseFirstImage(row.bookImage),
    },
    seller: {
      id: row.sellerId,
      name: row.sellerName || '匿名用户',
      avatarUrl: row.sellerAvatar,
    },
    buyer: {
      id: row.buyerId,
      name: row.buyerName || '匿名用户',
      avatarUrl: row.buyerAvatar,
    },
    sellerReviewed: !!row.sellerReviewType,
    buyerReviewed: !!row.buyerReviewType,
    // 当前登录用户是否还能评价
    canReview:
      row.status === 'completed' &&
      (row.sellerId === userId ? !row.sellerReviewType : !row.buyerReviewType),
  }));

  const pendingReviewCount = transactions.filter(t => t.canReview).length;

  res.json({ transactions, pendingReviewCount });
};

// simple-array 以逗号拼接存储，取第一张作为封面
const parseFirstImage = (raw: string | null): string | null => {
  if (!raw) return null;
  const first = raw.split(',')[0]?.trim();
  return first || null;
};
