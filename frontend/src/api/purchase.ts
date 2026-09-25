import request from './request';
import type { PurchaseRequest, SubjectCategory } from '@/types';

export const createPurchaseRequest = (data: {
  bookTitle: string;
  author?: string;
  isbn?: string;
  expectedPrice?: number;
  conditions?: string[];
  description?: string;
  category: SubjectCategory;
  campus: string;
}) => {
  return request.post('/purchase-requests', data);
};

export const getPurchaseRequests = (params: {
  category?: SubjectCategory;
  campus?: string;
  page?: number;
  limit?: number;
}) => {
  return request.get<{ requests: PurchaseRequest[]; pagination: any }>('/purchase-requests', { params });
};

export const getMyPurchaseRequests = () => {
  return request.get<PurchaseRequest[]>('/my/purchase-requests');
};

export const closePurchaseRequest = (id: string) => {
  return request.put(`/purchase-requests/${id}/close`);
};
