import request from './request';
import type { User } from '@/types';

export interface LoginResponse {
  token: string;
  user: User;
}

export const sendCode = (email: string, studentId: string) => {
  return request.post('/auth/send-code', { email, studentId });
};

export const register = (data: { email: string; studentId: string; password: string; code: string }) => {
  return request.post<LoginResponse>('/auth/register', data);
};

export const login = (email: string, password: string) => {
  return request.post<LoginResponse>('/auth/login', { email, password });
};

export const getCurrentUser = () => {
  return request.get<User>('/user/me');
};

export const updateProfile = (data: { name?: string; department?: string; contactInfo?: string }) => {
  return request.put('/user/profile', data);
};

export const uploadAvatar = (file: File) => {
  const formData = new FormData();
  formData.append('avatar', file);
  return request.post<{ avatarUrl: string }>('/user/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
