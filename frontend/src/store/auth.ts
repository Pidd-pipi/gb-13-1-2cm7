import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User } from '@/types';
import { getCurrentUser } from '@/api/auth';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'));
  const user = ref<User | null>(null);

  const isAuthenticated = computed(() => !!token.value);

  const setToken = (newToken: string) => {
    token.value = newToken;
    localStorage.setItem('token', newToken);
  };

  const setUser = (newUser: User) => {
    user.value = newUser;
  };

  const fetchCurrentUser = async () => {
    if (token.value) {
      try {
        const result = await getCurrentUser();
        user.value = result;
      } catch {
        logout();
      }
    }
  };

  const logout = () => {
    token.value = null;
    user.value = null;
    localStorage.removeItem('token');
  };

  return {
    token,
    user,
    isAuthenticated,
    setToken,
    setUser,
    fetchCurrentUser,
    logout,
  };
});
