import { Request, Response } from 'express';
import { In, ILike, FindOperator, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Book, BookStatus, SubjectCategory, BookCondition } from '../entities/Book';
import { User } from '../entities/User';
import { Favorite } from '../entities/Favorite';
import { BrowsingHistory } from '../entities/BrowsingHistory';
import { Message } from '../entities/Message';
import { Transaction } from '../entities/Transaction';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { minioService } from '../services/minio.service';

const VALID_BOOK_STATUSES: BookStatus[] = ['available', 'reserved', 'sold'];

export const createBook = async (req: AuthenticatedRequest, res: Response) => {
  const {
    title,
    author,
    isbn,
    originalPrice,
    price,
    condition,
    tradeMethod,
    campus,
    category,
    description,
  } = req.body;

  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    return res.status(400).json({ message: '请上传至少一张图片' });
  }
  if (files.length > 5) {
    return res.status(400).json({ message: '最多上传5张图片' });
  }

  try {
    const imageUrls: string[] = [];
    for (const file of files) {
      const objectName = `books/${req.userId}-${Date.now()}-${file.originalname}`;
      const url = await minioService.uploadFile(file.buffer, objectName, file.mimetype);
      imageUrls.push(url);
    }

    const bookRepository = AppDataSource.getRepository(Book);
    const book = bookRepository.create({
      title,
      author,
      isbn,
      originalPrice: parseFloat(originalPrice),
      price: parseFloat(price),
      condition,
      images: imageUrls,
      tradeMethod,
      campus,
      category,
      description,
      sellerId: req.userId!,
      status: 'available' as BookStatus,
    });

    await bookRepository.save(book);
    res.status(201).json({ message: '发布成功', book });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '发布失败' });
  }
};

export const getBooks = async (req: Request, res: Response) => {
  const {
    keyword,
    category,
    minPrice,
    maxPrice,
    condition,
    sort = 'createdAt',
    order = 'DESC',
    page = 1,
    limit = 20,
  } = req.query;

  const bookRepository = AppDataSource.getRepository(Book);
  const where: any = { status: 'available' };

  if (keyword) {
    where.title = ILike(`%${keyword}%`);
  }
  if (category) {
    where.category = category as SubjectCategory;
  }
  if (condition) {
    where.condition = condition as BookCondition;
  }
  if (minPrice || maxPrice) {
    if (minPrice && maxPrice) {
      where.price = Between(parseFloat(minPrice as string), parseFloat(maxPrice as string));
    } else if (minPrice) {
      where.price = MoreThanOrEqual(parseFloat(minPrice as string));
    } else {
      where.price = LessThanOrEqual(parseFloat(maxPrice as string));
    }
  }

  const [books, total] = await bookRepository.findAndCount({
    where,
    relations: ['seller'],
    order: { [sort as string]: order as 'ASC' | 'DESC' },
    skip: (parseInt(page as string) - 1) * parseInt(limit as string),
    take: parseInt(limit as string),
    select: {
      seller: {
        id: true,
        name: true,
        avatarUrl: true,
        department: true,
        positiveRatingRate: true,
      },
    },
  });

  res.json({
    books,
    pagination: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      totalPages: Math.ceil(total / parseInt(limit as string)),
    },
  });
};

export const getBookById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as AuthenticatedRequest).userId;

  const bookRepository = AppDataSource.getRepository(Book);
  const book = await bookRepository.findOne({
    where: { id },
    relations: ['seller'],
    select: {
      seller: {
        id: true,
        name: true,
        avatarUrl: true,
        department: true,
        contactInfo: true,
        positiveRatingRate: true,
        totalReviews: true,
      },
    },
  });

  if (!book) {
    return res.status(404).json({ message: '书籍不存在' });
  }

  if (userId && userId !== book.sellerId) {
    const historyRepository = AppDataSource.getRepository(BrowsingHistory);
    const history = historyRepository.create({
      userId,
      bookId: book.id,
    });
    await historyRepository.save(history);
  }

  res.json(book);
};

export const updateBookStatus = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status, buyerId } = req.body;

  if (!VALID_BOOK_STATUSES.includes(status)) {
    return res.status(400).json({ message: '无效的书籍状态' });
  }

  const bookRepository = AppDataSource.getRepository(Book);
  const book = await bookRepository.findOne({ where: { id } });

  if (!book) {
    return res.status(404).json({ message: '书籍不存在' });
  }

  if (book.sellerId !== req.userId) {
    return res.status(403).json({ message: '无权限操作' });
  }

  const transactionRepository = AppDataSource.getRepository(Transaction);

  if (status === 'sold') {
    if (book.status === 'sold') {
      return res.status(400).json({ message: '该书籍已售出' });
    }

    if (!buyerId) {
      return res.status(400).json({ message: '请从聊过这本书的同学中选择买家' });
    }

    if (buyerId === req.userId) {
      return res.status(400).json({ message: '不能选择自己作为买家' });
    }

    const messageRepository = AppDataSource.getRepository(Message);
    const chatted = await messageRepository.findOne({
      where: [
        { bookId: id, senderId: buyerId, receiverId: req.userId },
        { bookId: id, senderId: req.userId, receiverId: buyerId },
      ],
    });

    if (!chatted) {
      return res.status(400).json({ message: '该同学没有聊过这本书，无法选为买家' });
    }

    try {
      await AppDataSource.transaction(async (manager) => {
        book.status = 'sold';
        await manager.save(book);

        const transaction = manager.create(Transaction, {
          bookId: id,
          sellerId: req.userId!,
          buyerId,
          status: 'pending_confirm',
        });
        await manager.save(transaction);
      });
    } catch (error) {
      return res.status(400).json({ message: '该书籍已存在成交记录' });
    }

    return res.json({ message: '已标记售出，等待买家确认收货', book });
  }

  // 从已售出恢复为可购买/已预约：仅允许取消尚未确认收货的交易
  if (book.status === 'sold') {
    const transaction = await transactionRepository.findOne({ where: { bookId: id } });
    if (transaction) {
      if (transaction.status === 'completed') {
        return res.status(400).json({ message: '交易已完成，无法修改书籍状态' });
      }
      await transactionRepository.remove(transaction);
    }
  }

  book.status = status;
  await bookRepository.save(book);

  res.json({ message: '状态更新成功', book });
};

// 卖家标记售出时，可选的买家：与卖家聊过这本书的同学
export const getBookChatUsers = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const bookRepository = AppDataSource.getRepository(Book);
  const book = await bookRepository.findOne({ where: { id } });

  if (!book) {
    return res.status(404).json({ message: '书籍不存在' });
  }

  if (book.sellerId !== req.userId) {
    return res.status(403).json({ message: '无权限操作' });
  }

  const messageRepository = AppDataSource.getRepository(Message);
  const messages = await messageRepository.find({
    where: [
      { bookId: id, senderId: req.userId },
      { bookId: id, receiverId: req.userId },
    ],
  });

  const userIds = new Set<string>();
  messages.forEach((msg) => {
    const otherId = msg.senderId === req.userId ? msg.receiverId : msg.senderId;
    if (otherId !== req.userId) {
      userIds.add(otherId);
    }
  });

  if (userIds.size === 0) {
    return res.json([]);
  }

  const userRepository = AppDataSource.getRepository(User);
  const users = await userRepository.find({
    where: { id: In(Array.from(userIds)) },
    select: ['id', 'name', 'avatarUrl', 'studentId', 'department'],
  });

  res.json(users);
};

export const deleteBook = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const bookRepository = AppDataSource.getRepository(Book);
  const book = await bookRepository.findOne({ where: { id } });

  if (!book) {
    return res.status(404).json({ message: '书籍不存在' });
  }

  if (book.sellerId !== req.userId) {
    return res.status(403).json({ message: '无权限操作' });
  }

  await bookRepository.delete({ id });
  res.json({ message: '删除成功' });
};

export const getMyBooks = async (req: AuthenticatedRequest, res: Response) => {
  const bookRepository = AppDataSource.getRepository(Book);
  const books = await bookRepository.find({
    where: { sellerId: req.userId },
    order: { createdAt: 'DESC' },
  });

  res.json(books);
};

export const getRecommendBooks = async (req: AuthenticatedRequest, res: Response) => {
  const userRepository = AppDataSource.getRepository(User);
  const user = await userRepository.findOne({ where: { id: req.userId } });

  const bookRepository = AppDataSource.getRepository(Book);
  let books: Book[];

  if (user?.department) {
    books = await bookRepository
      .createQueryBuilder('book')
      .leftJoinAndSelect('book.seller', 'seller')
      .where('book.status = :status', { status: 'available' })
      .andWhere('book.sellerId != :userId', { userId: req.userId })
      .andWhere('seller.department = :department', { department: user.department })
      .orderBy('book.createdAt', 'DESC')
      .take(10)
      .getMany();
  } else {
    books = await bookRepository.find({
      where: { status: 'available' },
      relations: ['seller'],
      order: { createdAt: 'DESC' },
      take: 10,
    });
  }

  res.json(books);
};
