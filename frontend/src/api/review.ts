import request from './request';
import type { Review, ReviewType } from '@/types';

export const createReview = (data: {
  revieweeId: string;
  bookId?: string;
  type: ReviewType;
  content?: string;
}) => {
  return request.post('/reviews', data);
};

export const getUserReviews = (userId: string) => {
  return request.get<Review[]>(`/reviews/user/${userId}`);
};
