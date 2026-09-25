import request from './request';
import type { Transaction, User } from '@/types';

export const getBookChatUsers = (bookId: string) => {
  return request.get<User[]>(`/books/${bookId}/chat-users`);
};

export const confirmTransaction = (id: string) => {
  return request.post<{ message: string }>(`/transactions/${id}/confirm`);
};

export const getMyTransactions = () => {
  return request.get<Transaction[]>('/my/transactions');
};
