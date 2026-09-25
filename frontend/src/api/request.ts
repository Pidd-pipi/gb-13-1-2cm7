import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';
import { showToast } from 'vant';
import { useAuthStore } from '@/store/auth';

interface DataClient {
  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;
  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;
}

const request = axios.create({
  baseURL: '/api',
  timeout: 10000,
}) as DataClient & ReturnType<typeof axios.create>;

request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

request.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const { response } = error;
    if (response) {
      if (response.status === 401) {
        const authStore = useAuthStore();
        authStore.logout();
        showToast('登录已过期，请重新登录');
        window.location.href = '/login';
      } else {
        showToast(response.data?.message || '请求失败');
      }
    } else {
      showToast('网络错误');
    }
    return Promise.reject(error);
  }
);

export default request;
