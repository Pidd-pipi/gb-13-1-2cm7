import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Review, ReviewType } from '../entities/Review';
import { Transaction } from '../entities/Transaction';
import { User } from '../entities/User';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

const VALID_REVIEW_TYPES: ReviewType[] = ['positive', 'neutral', 'negative'];

export const createReview = async (req: AuthenticatedRequest, res: Response) => {
  const { bookId, type, content } = req.body;

  if (!bookId) {
    return res.status(400).json({ message: '缺少交易书籍信息' });
  }

  if (!VALID_REVIEW_TYPES.includes(type)) {
    return res.status(400).json({ message: '无效的评价类型' });
  }

  const transactionRepository = AppDataSource.getRepository(Transaction);
  const transaction = await transactionRepository.findOne({ where: { bookId } });

  // 未成交：拒绝
  if (!transaction) {
    return res.status(400).json({ message: '该书籍尚未成交，无法评价' });
  }

  // 买家尚未确认收货：拒绝
  if (transaction.status !== 'completed') {
    return res.status(400).json({ message: '买家确认收货后双方才能评价' });
  }

  const isSeller = transaction.sellerId === req.userId;
  const isBuyer = transaction.buyerId === req.userId;

  // 非交易双方：拒绝
  if (!isSeller && !isBuyer) {
    return res.status(403).json({ message: '只有交易双方才能评价' });
  }

  // 同一方重复提交：拒绝
  if ((isSeller && transaction.sellerReviewed) || (isBuyer && transaction.buyerReviewed)) {
    return res.status(400).json({ message: '已评价过该交易，请勿重复提交' });
  }

  // 被评价人由交易记录确定，不信任前端传入
  const revieweeId = isSeller ? transaction.buyerId : transaction.sellerId;

  const reviewRepository = AppDataSource.getRepository(Review);
  const existing = await reviewRepository.findOne({
    where: { reviewerId: req.userId, revieweeId, bookId },
  });
  if (existing) {
    return res.status(400).json({ message: '已评价过该交易，请勿重复提交' });
  }

  try {
    await AppDataSource.transaction(async (manager) => {
      const review = manager.create(Review, {
        reviewerId: req.userId!,
        revieweeId,
        bookId,
        type,
        content,
      });
      await manager.save(review);

      if (isSeller) {
        await manager.update(Transaction, { id: transaction.id }, { sellerReviewed: true });
      } else {
        await manager.update(Transaction, { id: transaction.id }, { buyerReviewed: true });
      }

      // 更新被评价人的累计好评率（首次评价时即更新）
      await manager.increment(User, { id: revieweeId }, 'totalReviews', 1);
      if (type === 'positive') {
        await manager.increment(User, { id: revieweeId }, 'positiveReviews', 1);
      }
      const reviewee = await manager.findOne(User, { where: { id: revieweeId } });
      if (reviewee) {
        reviewee.positiveRatingRate =
          reviewee.totalReviews > 0 ? (reviewee.positiveReviews / reviewee.totalReviews) * 100 : 0;
        await manager.save(reviewee);
      }
    });
  } catch (error) {
    return res.status(400).json({ message: '评价提交失败，请不要重复提交' });
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
      reviewer: {
        id: true,
        name: true,
        avatarUrl: true,
      },
    },
  });

  res.json(reviews);
};
