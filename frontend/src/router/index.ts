import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/store/auth';

const routes = [
  {
    path: '/',
    redirect: '/home',
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/pages/Login.vue'),
    meta: { guest: true },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/pages/Register.vue'),
    meta: { guest: true },
  },
  {
    path: '/home',
    name: 'Home',
    component: () => import('@/pages/Home.vue'),
  },
  {
    path: '/search',
    name: 'Search',
    component: () => import('@/pages/Search.vue'),
  },
  {
    path: '/book/:id',
    name: 'BookDetail',
    component: () => import('@/pages/BookDetail.vue'),
  },
  {
    path: '/publish',
    name: 'Publish',
    component: () => import('@/pages/Publish.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/purchase-requests',
    name: 'PurchaseRequests',
    component: () => import('@/pages/PurchaseRequests.vue'),
  },
  {
    path: '/messages',
    name: 'Messages',
    component: () => import('@/pages/Messages.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/chat/:otherUserId',
    name: 'Chat',
    component: () => import('@/pages/Chat.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/pages/Profile.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/my-books',
    name: 'MyBooks',
    component: () => import('@/pages/MyBooks.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/favorites',
    name: 'Favorites',
    component: () => import('@/pages/Favorites.vue'),
    meta: { requiresAuth: true },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore();

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'Login', query: { redirect: to.fullPath } });
  } else if (to.meta.guest && authStore.isAuthenticated) {
    next({ name: 'Home' });
  } else {
    next();
  }
});

export default router;
