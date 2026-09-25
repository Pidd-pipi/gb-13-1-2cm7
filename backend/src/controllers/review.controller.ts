import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Review, ReviewType } from '../entities/Review';
import { Transaction } from '../entities/Transaction';
import { User } from '../entities/User';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

const VALID_TYPES: ReviewType[] = ['positive', 'neutral', 'negative'];

export const createReview = async (req: AuthenticatedRequest, res: Response) => {
  const { transactionId, type, content } = req.body;
  const reviewerId = req.userId!;

  if (!transactionId || !VALID_TYPES.includes(type)) {
    return res.status(400).json({ message: '评价参数不完整' });
  }

  const transactionRepository = AppDataSource.getRepository(Transaction);
  const transaction = await transactionRepository.findOne({ where: { id: transactionId } });

  if (!transaction) {
    return res.status(404).json({ message: '交易不存在或未成交' });
  }

  // 非交易双方不能评价
  const isSeller = transaction.sellerId === reviewerId;
  const isBuyer = transaction.buyerId === reviewerId;
  if (!isSeller && !isBuyer) {
    return res.status(403).json({ message: '只有交易双方可以评价' });
  }

  // 买家确认收货后才开放评价
  if (transaction.status !== 'completed') {
    return res.status(400).json({ message: '买家确认收货后才能评价' });
  }

  const reviewRepository = AppDataSource.getRepository(Review);

  // 每一方对一笔交易只有一次评价机会
  const existing = await reviewRepository.findOne({
    where: { reviewerId, transactionId },
  });
  if (existing) {
    return res.status(400).json({ message: '您已评价过该交易，请勿重复提交' });
  }

  const revieweeId = isSeller ? transaction.buyerId : transaction.sellerId;

  try {
    await AppDataSource.transaction(async manager => {
      const review = manager.create(Review, {
        reviewerId,
        revieweeId,
        transactionId,
        bookId: transaction.bookId,
        type,
        content: content || null,
      });
      await manager.save(review);

      // 累计好评率随每笔首次（唯一）评价更新
      const user = await manager.findOne(User, { where: { id: revieweeId } });
      if (user) {
        user.totalReviews += 1;
        if (type === 'positive') {
          user.positiveReviews += 1;
        }
        user.positiveRatingRate = (user.positiveReviews / user.totalReviews) * 100;
        await manager.save(user);
      }
    });
  } catch (error: any) {
    // 并发重复提交：(reviewerId, transactionId) 唯一约束兜底
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: '您已评价过该交易，请勿重复提交' });
    }
    console.error(error);
    return res.status(500).json({ message: '评价失败' });
  }

  res.status(201).json({ message: '评价成功' });
};

export const getUserReviews = async (req: Request, res: Response) => {
  const { userId } = req.params;

  const reviewRepository = AppDataSource.getRepository(Review);
  const reviews = await reviewRepository.find({
    where: { revieweeId: userId },
    relations: ['reviewer'],
    order: { createdAt: 'DESC' },
    select: {
      id: true,
      type: true,
      content: true,
      bookId: true,
      createdAt: true,
      reviewer: {
        id: true,
        name: true,
        avatarUrl: true,
      },
    },
  });

  res.json(reviews);
};
