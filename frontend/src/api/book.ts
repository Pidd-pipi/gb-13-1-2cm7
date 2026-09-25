import request from './request';
import type { Book, BookCondition, BookStatus, SubjectCategory, TradeMethod } from '@/types';

export interface BookListParams {
  keyword?: string;
  category?: SubjectCategory;
  minPrice?: number;
  maxPrice?: number;
  condition?: BookCondition;
  sort?: 'createdAt' | 'price';
  order?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

export interface BookListResponse {
  books: Book[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const getBooks = (params: BookListParams) => {
  return request.get<BookListResponse>('/books', { params });
};

export const getBookById = (id: string) => {
  return request.get<Book>(`/books/${id}`);
};

export const createBook = (data: {
  title: string;
  author: string;
  isbn?: string;
  originalPrice: number;
  price: number;
  condition: BookCondition;
  tradeMethod: TradeMethod;
  campus: string;
  category: SubjectCategory;
  description?: string;
  images: File[];
}) => {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (key === 'images') {
      (value as File[]).forEach((file) => formData.append('images', file));
    } else if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });
  return request.post<{ book: Book }>('/books', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const updateBookStatus = (id: string, status: BookStatus) => {
  return request.put(`/books/${id}/status`, { status });
};

export const deleteBook = (id: string) => {
  return request.delete(`/books/${id}`);
};

export const getMyBooks = () => {
  return request.get<Book[]>('/my/books');
};

export const getRecommendBooks = () => {
  return request.get<Book[]>('/recommend/books');
};

export const toggleFavorite = (bookId: string) => {
  return request.post<{ isFavorite: boolean }>('/favorites/toggle', { bookId });
};

export const getFavorites = () => {
  return request.get<Book[]>('/favorites');
};
