<template>
  <div class="book-card" @click="$emit('click')">
    <van-image
      :src="book.images[0]"
      width="120"
      height="120"
      fit="cover"
    />
    <div class="book-info">
      <div>
        <div class="book-title">{{ book.title }}</div>
        <div class="book-author">{{ book.author }}</div>
        <div class="tags">
          <span class="condition-tag">{{ conditionMap[book.condition] }}</span>
          <span class="category-tag">{{ categoryMap[book.category] }}</span>
        </div>
      </div>
      <div class="price-row">
        <span class="book-price">¥{{ book.price }}</span>
        <span class="book-original-price">¥{{ book.originalPrice }}</span>
      </div>
      <div v-if="book.seller" class="seller-info">
        <van-icon name="user-o" size="12" />
        <span>{{ book.seller.name || book.seller.department || '匿名用户' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Book } from '@/types';
import { conditionMap, categoryMap } from '@/types';

defineProps<{
  book: Book;
}>();
defineEmits<{
  click: [];
}>();
</script>

<style scoped>
.book-card {
  display: flex;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 12px;
}
.book-info {
  flex: 1;
  padding: 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.book-title {
  font-size: 15px;
  font-weight: 500;
  color: #1a1a1a;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.book-author {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}
.tags {
  margin-top: 6px;
}
.condition-tag, .category-tag {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  margin-right: 6px;
}
.condition-tag {
  background: #e6f7ff;
  color: #1890ff;
}
.category-tag {
  background: #f6ffed;
  color: #52c41a;
}
.price-row {
  margin-top: 8px;
}
.book-price {
  font-size: 18px;
  font-weight: bold;
  color: #ff4d4f;
}
.book-original-price {
  font-size: 12px;
  color: #999;
  text-decoration: line-through;
  margin-left: 8px;
}
.seller-info {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #666;
  margin-top: 8px;
  gap: 4px;
}
</style>
