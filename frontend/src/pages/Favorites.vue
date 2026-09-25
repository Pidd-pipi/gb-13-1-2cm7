<template>
  <div class="page-container">
    <van-nav-bar title="我的收藏" left-arrow @click-left="router.back" />
    
    <van-loading v-if="loading" class="loading-center" />
    
    <div v-else-if="books.length > 0">
      <BookCard
        v-for="book in books"
        :key="book.id"
        :book="book"
        @click="router.push(`/book/${book.id}`)"
      />
    </div>
    
    <van-empty v-else description="暂无收藏的书籍" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getFavorites } from '@/api/book';
import BookCard from '@/components/BookCard.vue';
import type { Book } from '@/types';

const router = useRouter();
const loading = ref(true);
const books = ref<Book[]>([]);

const fetchFavorites = async () => {
  loading.value = true;
  try {
    books.value = await getFavorites();
  } finally {
    loading.value = false;
  }
};

onMounted(fetchFavorites);
</script>

<style scoped>
.loading-center {
  display: flex;
  justify-content: center;
  padding: 100px;
}
</style>
