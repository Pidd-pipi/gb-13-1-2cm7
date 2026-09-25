import request from './request';
import type { Review, ReviewType, TransactionItem, BuyerCandidate } from '@/types';

export const createReview = (data: {
  transactionId: string;
  type: ReviewType;
  content?: string;
}) => {
  return request.post('/reviews', data);
};

export const getUserReviews = (userId: string) => {
  return request.get<Review[]>(`/reviews/user/${userId}`);
};

export const getBuyerCandidates = (bookId: string) => {
  return request.get<BuyerCandidate[]>(`/books/${bookId}/buyer-candidates`);
};

export const markBookSold = (bookId: string, buyerId: string) => {
  return request.post<{ transaction: TransactionItem }>(`/books/${bookId}/sold`, { buyerId });
};

export const confirmTransaction = (id: string) => {
  return request.put(`/transactions/${id}/confirm`);
};

export const getMyTransactions = () => {
  return request.get<{ transactions: TransactionItem[]; pendingReviewCount: number }>('/my/transactions');
};
