import apiClient from './client';
import type { LoginResponse, User } from '@/types';

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const { data } = await apiClient.post<LoginResponse>('/auth/login', { email, password });
    return data;
  },
  register: async (payload: Record<string, string>): Promise<LoginResponse> => {
    const { data } = await apiClient.post<LoginResponse>('/auth/register', payload);
    return data;
  },
  me: async (): Promise<User> => {
    const { data } = await apiClient.get<User>('/auth/me');
    return data;
  },
  updateMe: async (payload: {
    fullName: string;
    email: string;
    phoneNumber?: string;
    password?: string;
  }): Promise<User> => {
    const { data } = await apiClient.put<User>('/auth/me', payload);
    return data;
  },
  forgotPassword: async (email: string) => {
    const { data } = await apiClient.post<{ message: string; resetCode?: string }>(
      '/auth/forgot-password',
      { email }
    );
    return data;
  },
  resetPassword: async (payload: { email: string; resetCode: string; newPassword: string }) => {
    const { data } = await apiClient.post<{ message: string }>('/auth/reset-password', {
      email: payload.email,
      resetCode: payload.resetCode,
      newPassword: payload.newPassword,
    });
    return data;
  },
};
