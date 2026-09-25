import request from './request';
import type { Message } from '@/types';

export const sendMessage = (data: {
  receiverId: string;
  bookId?: string;
  content: string;
  images?: File[];
}) => {
  const formData = new FormData();
  formData.append('receiverId', data.receiverId);
  if (data.bookId) formData.append('bookId', data.bookId);
  formData.append('content', data.content);
  if (data.images) {
    data.images.forEach((file) => formData.append('images', file));
  }
  return request.post('/messages', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const getConversations = () => {
  return request.get<Message[]>('/messages/conversations');
};

export const getMessages = (otherUserId: string, bookId?: string) => {
  const params: any = { otherUserId };
  if (bookId) params.bookId = bookId;
  return request.get<Message[]>('/messages', { params });
};

export const getUnreadCount = () => {
  return request.get<{ count: number }>('/messages/unread-count');
};
