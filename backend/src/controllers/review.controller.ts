import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Review, ReviewType } from '../entities/Review';
import { User } from '../entities/User';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export const createReview = async (req: AuthenticatedRequest, res: Response) => {
  const { revieweeId, bookId, type, content } = req.body;

  if (req.userId === revieweeId) {
    return res.status(400).json({ message: '不能评价自己' });
  }

  const reviewRepository = AppDataSource.getRepository(Review);
  const existing = await reviewRepository.findOne({
    where: { reviewerId: req.userId, revieweeId, bookId },
  });

  if (existing) {
    return res.status(400).json({ message: '已评价过该交易' });
  }

  const review = reviewRepository.create({
    reviewerId: req.userId!,
    revieweeId,
    bookId,
    type,
    content,
  });

  await reviewRepository.save(review);

  const userRepository = AppDataSource.getRepository(User);
  const user = await userRepository.findOne({ where: { id: revieweeId } });

  if (user) {
    user.totalReviews += 1;
    if (type === 'positive') {
      user.positiveReviews += 1;
    }
    user.positiveRatingRate = (user.positiveReviews / user.totalReviews) * 100;
    await userRepository.save(user);
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
