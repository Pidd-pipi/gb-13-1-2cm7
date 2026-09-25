<template>
  <div class="page-container">
    <van-nav-bar title="我的交易" left-arrow @click-left="router.back" />

    <van-tabs v-model:active="activeTab" sticky @change="filterTransactions">
      <van-tab title="全部" />
      <van-tab title="待收货" :badge="pendingConfirmCount || ''" />
      <van-tab :title="`待评价${pendingReviewCount ? `(${pendingReviewCount})` : ''}`" />
      <van-tab title="已完成" />
    </van-tabs>

    <van-loading v-if="loading" class="loading-center" />

    <div v-else-if="filtered.length > 0" class="tx-list">
      <div v-for="tx in filtered" :key="tx.id" class="tx-card">
        <div class="tx-top">
          <van-image
            :src="tx.book.cover || defaultAvatar"
            width="56"
            height="56"
            fit="cover"
            radius="6"
            @click="router.push(`/book/${tx.bookId}`)"
          />
          <div class="tx-book">
            <div class="tx-title" @click="router.push(`/book/${tx.bookId}`)">{{ tx.book.title }}</div>
            <div class="tx-price">¥{{ tx.book.price }}</div>
          </div>
          <div class="tx-state">{{ getStateText(tx) }}</div>
        </div>

        <div class="tx-parties">
          <div class="party">
            <van-image round width="28" height="28" :src="tx.seller.avatarUrl || defaultAvatar" />
            <span class="party-name">{{ tx.seller.name }}</span>
            <van-tag plain type="primary">卖家</van-tag>
            <van-tag v-if="tx.status === 'completed'" :type="tx.sellerReviewed ? 'success' : 'default'">
              {{ tx.sellerReviewed ? '已评价' : '待评价' }}
            </van-tag>
          </div>
          <div class="party">
            <van-image round width="28" height="28" :src="tx.buyer.avatarUrl || defaultAvatar" />
            <span class="party-name">{{ tx.buyer.name }}</span>
            <van-tag plain type="warning">买家</van-tag>
            <van-tag v-if="tx.status === 'completed'" :type="tx.buyerReviewed ? 'success' : 'default'">
              {{ tx.buyerReviewed ? '已评价' : '待评价' }}
            </van-tag>
          </div>
        </div>

        <div class="tx-actions">
          <van-button
            v-if="tx.role === 'buyer' && tx.status === 'sold'"
            type="primary"
            size="small"
            round
            @click="handleConfirm(tx)"
          >
            确认收货
          </van-button>
          <van-button
            v-if="tx.canReview"
            type="danger"
            size="small"
            round
            @click="openReview(tx)"
          >
            评价{{ tx.role === 'seller' ? '买家' : '卖家' }}
          </van-button>
          <span v-if="tx.role === 'seller' && tx.status === 'sold'" class="tx-hint">等待买家确认收货</span>
        </div>
      </div>
    </div>

    <van-empty v-else description="暂无相关交易" />

    <van-popup v-model:show="showReview" position="bottom" round :style="{ height: '55%' }">
      <div class="review-header">评价{{ reviewTargetName }}</div>
      <div class="review-types">
        <div
          v-for="item in reviewOptions"
          :key="item.value"
          :class="['review-type', { active: reviewForm.type === item.value }]"
          @click="reviewForm.type = item.value"
        >
          {{ item.label }}
        </div>
      </div>
      <van-field
        v-model="reviewForm.content"
        type="textarea"
        rows="4"
        maxlength="300"
        show-word-limit
        placeholder="说说这次交易的感受（选填）"
        class="review-content"
      />
      <div class="review-submit">
        <van-button type="primary" block round :loading="submitting" @click="submitReview">提交评价</van-button>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { showConfirmDialog, showToast } from 'vant';
import {
  getMyTransactions,
  confirmTransaction,
  createReview,
} from '@/api/review';
import type { TransactionItem, ReviewType } from '@/types';

const router = useRouter();
const defaultAvatar = 'https://img.yzcdn.cn/vant/user-inactive.png';

const loading = ref(true);
const transactions = ref<TransactionItem[]>([]);
const activeTab = ref(0);
const filtered = ref<TransactionItem[]>([]);

const pendingConfirmCount = computed(
  () => transactions.value.filter(t => t.role === 'buyer' && t.status === 'sold').length
);
const pendingReviewCount = computed(() => transactions.value.filter(t => t.canReview).length);

const fetchTransactions = async () => {
  loading.value = true;
  try {
    const result = await getMyTransactions();
    transactions.value = result.transactions;
    filterTransactions();
  } finally {
    loading.value = false;
  }
};

const filterTransactions = () => {
  if (activeTab.value === 1) {
    filtered.value = transactions.value.filter(t => t.role === 'buyer' && t.status === 'sold');
  } else if (activeTab.value === 2) {
    filtered.value = transactions.value.filter(t => t.canReview);
  } else if (activeTab.value === 3) {
    filtered.value = transactions.value.filter(t => t.status === 'completed');
  } else {
    filtered.value = transactions.value;
  }
};

const getStateText = (tx: TransactionItem) => {
  if (tx.status === 'sold') return '待收货';
  if (tx.sellerReviewed && tx.buyerReviewed) return '已互评';
  if (tx.canReview) return '待评价';
  return '对方待评价';
};

const handleConfirm = async (tx: TransactionItem) => {
  try {
    await showConfirmDialog({ title: '确认收货', message: '确认已经收到书了吗？确认后双方即可互相评价。' });
  } catch {
    return;
  }
  try {
    await confirmTransaction(tx.id);
    showToast('确认成功，可进行评价');
    fetchTransactions();
  } catch {}
};

const showReview = ref(false);
const submitting = ref(false);
const reviewingTx = ref<TransactionItem | null>(null);
const reviewForm = reactive<{ type: ReviewType; content: string }>({ type: 'positive', content: '' });

const reviewOptions: { value: ReviewType; label: string }[] = [
  { value: 'positive', label: '好评' },
  { value: 'neutral', label: '中评' },
  { value: 'negative', label: '差评' },
];

const reviewTargetName = computed(() => {
  const tx = reviewingTx.value;
  if (!tx) return '';
  return tx.role === 'seller' ? `买家 ${tx.buyer.name}` : `卖家 ${tx.seller.name}`;
});

const openReview = (tx: TransactionItem) => {
  reviewingTx.value = tx;
  reviewForm.type = 'positive';
  reviewForm.content = '';
  showReview.value = true;
};

const submitReview = async () => {
  if (!reviewingTx.value) return;
  submitting.value = true;
  try {
    await createReview({
      transactionId: reviewingTx.value.id,
      type: reviewForm.type,
      content: reviewForm.content.trim() || undefined,
    });
    showToast('评价成功');
    showReview.value = false;
    fetchTransactions();
  } catch {
    // 拦截器已提示错误
  } finally {
    submitting.value = false;
  }
};

onMounted(fetchTransactions);
</script>

<style scoped>
.loading-center {
  display: flex;
  justify-content: center;
  padding: 100px;
}
.tx-list {
  padding: 12px;
}
.tx-card {
  background: white;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}
.tx-top {
  display: flex;
  align-items: center;
}
.tx-book {
  flex: 1;
  margin-left: 12px;
  overflow: hidden;
}
.tx-title {
  font-size: 15px;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tx-price {
  font-size: 16px;
  font-weight: bold;
  color: #ff4d4f;
  margin-top: 4px;
}
.tx-state {
  font-size: 13px;
  color: #ff9800;
}
.tx-parties {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f5f5f5;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.party {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #333;
}
.party-name {
  margin: 0 2px;
}
.tx-actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
}
.tx-hint {
  font-size: 12px;
  color: #999;
}
.review-header {
  text-align: center;
  font-size: 16px;
  font-weight: 500;
  padding: 16px;
}
.review-types {
  display: flex;
  justify-content: center;
  gap: 12px;
  padding: 8px 16px 16px;
}
.review-type {
  flex: 1;
  text-align: center;
  padding: 10px 0;
  border-radius: 20px;
  background: #f7f8fa;
  color: #666;
  font-size: 14px;
}
.review-type.active {
  background: #1989fa;
  color: white;
}
.review-content {
  margin: 0 12px;
  border-radius: 8px;
  background: #f7f8fa;
}
.review-submit {
  padding: 16px;
}
</style>
