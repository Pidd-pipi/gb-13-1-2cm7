<template>
  <div class="purchase-card">
    <div class="purchase-header">
      <div class="purchase-title">{{ request.bookTitle }}</div>
      <van-tag v-if="request.status === 'active'" type="primary">求购中</van-tag>
      <van-tag v-else type="default">已关闭</van-tag>
    </div>
    <div class="purchase-meta" v-if="request.author">
      <span>作者：{{ request.author }}</span>
    </div>
    <div class="purchase-meta" v-if="request.expectedPrice">
      <span class="price">期望价格：¥{{ request.expectedPrice }}</span>
    </div>
    <div class="purchase-meta" v-if="request.conditions?.length">
      <span>新旧要求：{{ request.conditions.join('、') }}</span>
    </div>
    <div class="purchase-footer">
      <span>{{ categoryMap[request.category] }} · {{ request.campus }}</span>
      <div class="requester" v-if="request.requester">
        <van-icon name="user-o" size="12" />
        <span>{{ request.requester.name || request.requester.department || '匿名' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PurchaseRequest } from '@/types';
import { categoryMap } from '@/types';

defineProps<{
  request: PurchaseRequest;
}>();
</script>

<style scoped>
.purchase-card {
  background: white;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}
.purchase-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.purchase-title {
  font-size: 15px;
  font-weight: 500;
  color: #1a1a1a;
  flex: 1;
  margin-right: 8px;
}
.purchase-meta {
  font-size: 13px;
  color: #666;
  margin-top: 8px;
}
.purchase-meta .price {
  color: #ff4d4f;
}
.purchase-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
  font-size: 12px;
  color: #999;
}
.requester {
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
