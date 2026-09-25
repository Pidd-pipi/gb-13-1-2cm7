<template>
  <div class="page-container">
    <van-nav-bar title="校园二手书" @click-right="goProfile">
      <template #left>
        <van-icon name="search" size="22" @click="router.push('/search')" />
      </template>
      <template #right>
        <van-icon name="user-o" size="22" />
      </template>
    </van-nav-bar>
    
    <van-tabs v-model:active="activeTab">
      <van-tab title="推荐">
        <div v-if="authStore.isAuthenticated" class="section">
          <h3 class="section-title">同院系推荐</h3>
          <div v-if="loadingRecommend" class="loading-wrap">
            <van-loading />
          </div>
          <div v-else-if="recommendBooks.length > 0">
            <BookCard
              v-for="book in recommendBooks"
              :key="book.id"
              :book="book"
              @click="goDetail(book.id)"
            />
          </div>
          <van-empty v-else description="暂无推荐书籍" />
        </div>
        
        <div class="section">
          <h3 class="section-title">最新发布</h3>
          <div v-if="loadingBooks" class="loading-wrap">
            <van-loading />
          </div>
          <div v-else-if="latestBooks.length > 0">
            <BookCard
              v-for="book in latestBooks"
              :key="book.id"
              :book="book"
              @click="goDetail(book.id)"
            />
          </div>
          <van-empty v-else description="暂无书籍" />
        </div>
      </van-tab>
      
      <van-tab title="求购">
        <div class="section">
          <div class="header-actions">
            <van-button type="primary" size="small" round @click="goPublishRequest">
              发布求购
            </van-button>
          </div>
          <van-loading v-if="loadingRequests" />
          <PurchaseCard
            v-else-if="purchaseRequests.length > 0"
            v-for="item in purchaseRequests"
            :key="item.id"
            :request="item"
          />
          <van-empty v-else description="暂无求购信息" />
        </div>
      </van-tab>
    </van-tabs>
    
    <van-tabbar v-model:active="activeTabbar" route>
      <van-tabbar-item to="/home" icon="home-o">首页</van-tabbar-item>
      <van-tabbar-item to="/search" icon="search">搜索</van-tabbar-item>
      <van-tabbar-item to="/publish" icon="plus">发布</van-tabbar-item>
      <van-tabbar-item to="/messages" icon="chat-o">消息</van-tabbar-item>
      <van-tabbar-item to="/profile" icon="user-o">我的</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getBooks, getRecommendBooks } from '@/api/book';
import { getPurchaseRequests } from '@/api/purchase';
import { useAuthStore } from '@/store/auth';
import BookCard from '@/components/BookCard.vue';
import PurchaseCard from '@/components/PurchaseCard.vue';
import type { Book, PurchaseRequest } from '@/types';

const router = useRouter();
const authStore = useAuthStore();
const activeTab = ref(0);
const activeTabbar = ref(0);

const loadingBooks = ref(false);
const loadingRecommend = ref(false);
const loadingRequests = ref(false);
const latestBooks = ref<Book[]>([]);
const recommendBooks = ref<Book[]>([]);
const purchaseRequests = ref<PurchaseRequest[]>([]);

const fetchLatestBooks = async () => {
  loadingBooks.value = true;
  try {
    const result = await getBooks({ sort: 'createdAt', order: 'DESC', limit: 10 });
    latestBooks.value = result.books;
  } finally {
    loadingBooks.value = false;
  }
};

const fetchRecommendBooks = async () => {
  if (!authStore.isAuthenticated) return;
  loadingRecommend.value = true;
  try {
    recommendBooks.value = await getRecommendBooks();
  } finally {
    loadingRecommend.value = false;
  }
};

const fetchPurchaseRequests = async () => {
  loadingRequests.value = true;
  try {
    const result = await getPurchaseRequests({ limit: 20 });
    purchaseRequests.value = result.requests;
  } finally {
    loadingRequests.value = false;
  }
};

const goDetail = (id: string) => {
  router.push(`/book/${id}`);
};

const goProfile = () => {
  router.push('/profile');
};

const goPublishRequest = () => {
  if (!authStore.isAuthenticated) {
    router.push('/login');
    return;
  }
  router.push('/publish-request');
};

onMounted(() => {
  fetchLatestBooks();
  fetchRecommendBooks();
  fetchPurchaseRequests();
});
</script>

<style scoped>
.section {
  padding: 12px;
}
.section-title {
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 12px;
  color: #1a1a1a;
}
.loading-wrap {
  display: flex;
  justify-content: center;
  padding: 40px;
}
.header-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}
</style>
