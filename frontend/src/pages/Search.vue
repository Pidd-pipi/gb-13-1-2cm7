<template>
  <div class="page-container">
    <van-nav-bar title="搜索" left-arrow @click-left="router.back" />
    
    <div class="search-header">
      <van-search
        v-model="keyword"
        placeholder="搜索书名、作者、ISBN"
        shape="round"
        @search="onSearch"
      />
    </div>
    
    <van-dropdown-menu>
      <van-dropdown-item v-model="filters.category" :options="categoryOptions" title="分类" />
      <van-dropdown-item v-model="filters.condition" :options="conditionOptions" title="新旧程度" />
      <van-dropdown-item v-model="filters.sort" :options="sortOptions" title="排序" />
    </van-dropdown-menu>
    
    <div class="price-filter">
      <van-field
        v-model.number="filters.minPrice"
        type="number"
        placeholder="最低价"
      />
      <span class="price-separator">-</span>
      <van-field
        v-model.number="filters.maxPrice"
        type="number"
        placeholder="最高价"
      />
      <van-button type="primary" size="small" @click="onSearch">筛选</van-button>
    </div>
    
    <div class="search-results">
      <van-loading v-if="loading" />
      <div v-else-if="books.length > 0">
        <BookCard
          v-for="book in books"
          :key="book.id"
          :book="book"
          @click="router.push(`/book/${book.id}`)"
        />
      </div>
      <van-empty v-else description="暂无搜索结果" />
    </div>
    
    <van-tabbar v-model:active="activeTab" route>
      <van-tabbar-item to="/home" icon="home-o">首页</van-tabbar-item>
      <van-tabbar-item to="/search" icon="search">搜索</van-tabbar-item>
      <van-tabbar-item to="/publish" icon="plus">发布</van-tabbar-item>
      <van-tabbar-item to="/messages" icon="chat-o">消息</van-tabbar-item>
      <van-tabbar-item to="/profile" icon="user-o">我的</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import { useRouter } from 'vue-router';
import { getBooks } from '@/api/book';
import BookCard from '@/components/BookCard.vue';
import type { Book } from '@/types';

const router = useRouter();
const activeTab = ref(1);
const keyword = ref('');
const loading = ref(false);
const books = ref<Book[]>([]);

const filters = reactive({
  category: '',
  condition: '',
  sort: 'createdAt',
  minPrice: undefined as number | undefined,
  maxPrice: undefined as number | undefined,
});

const categoryOptions = [
  { text: '全部', value: '' },
  { text: '理工', value: 'science' },
  { text: '文史', value: 'humanities' },
  { text: '经管', value: 'business' },
  { text: '艺术', value: 'arts' },
  { text: '其他', value: 'other' },
];

const conditionOptions = [
  { text: '全部', value: '' },
  { text: '全新', value: 'new' },
  { text: '九成新', value: 'like_new' },
  { text: '七成新', value: 'good' },
  { text: '五成新', value: 'fair' },
];

const sortOptions = [
  { text: '最新发布', value: 'createdAt' },
  { text: '价格从低到高', value: 'price_asc' },
  { text: '价格从高到低', value: 'price_desc' },
];

const onSearch = async () => {
  loading.value = true;
  try {
    const params: any = {};
    if (keyword.value) params.keyword = keyword.value;
    if (filters.category) params.category = filters.category;
    if (filters.condition) params.condition = filters.condition;
    if (filters.minPrice !== undefined) params.minPrice = filters.minPrice;
    if (filters.maxPrice !== undefined) params.maxPrice = filters.maxPrice;
    
    if (filters.sort === 'price_asc') {
      params.sort = 'price';
      params.order = 'ASC';
    } else if (filters.sort === 'price_desc') {
      params.sort = 'price';
      params.order = 'DESC';
    } else {
      params.sort = 'createdAt';
      params.order = 'DESC';
    }
    
    const result = await getBooks(params);
    books.value = result.books;
  } finally {
    loading.value = false;
  }
};

watch([() => filters.category, () => filters.condition, () => filters.sort], onSearch);
</script>

<style scoped>
.search-header {
  padding: 12px;
  background: white;
}
.price-filter {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: white;
  margin-top: 8px;
}
.price-filter .van-field {
  flex: 1;
}
.price-separator {
  color: #999;
}
.search-results {
  padding: 12px;
}
</style>
