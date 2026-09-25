<template>
  <div class="detail-page">
    <van-nav-bar title="书籍详情" left-arrow @click-left="router.back" />
    
    <van-loading v-if="loading" class="loading-center" />
    
    <div v-else-if="book">
      <van-swipe class="detail-images" :autoplay="3000" indicator-color="white">
        <van-swipe-item v-for="(image, index) in book.images" :key="index">
          <van-image :src="image" fit="cover" width="100%" height="300px" />
        </van-swipe-item>
      </van-swipe>
      
      <div class="detail-header">
        <div class="detail-title">{{ book.title }}</div>
        <div class="detail-price-section">
          <span class="detail-price">¥{{ book.price }}</span>
          <span class="detail-original-price">¥{{ book.originalPrice }}</span>
          <van-tag :class="`status-${book.status}`" type="success" v-if="book.status === 'available'">可购买</van-tag>
          <van-tag v-else-if="book.status === 'reserved'" type="warning">已预约</van-tag>
          <van-tag v-else type="default">已售出</van-tag>
        </div>
        
        <div class="detail-meta">
          <span class="detail-meta-item">作者：{{ book.author }}</span>
          <span class="detail-meta-item">新旧：{{ conditionMap[book.condition] }}</span>
          <span class="detail-meta-item">分类：{{ categoryMap[book.category] }}</span>
          <span class="detail-meta-item">交易：{{ tradeMethodMap[book.tradeMethod] }}</span>
          <span class="detail-meta-item">校区：{{ book.campus }}</span>
          <span v-if="book.isbn" class="detail-meta-item">ISBN：{{ book.isbn }}</span>
        </div>
        
        <div class="detail-desc" v-if="book.description">
          <h4>描述</h4>
          <p>{{ book.description }}</p>
        </div>
      </div>
      
      <div class="detail-seller" v-if="book.seller">
        <van-image
          round
          width="48"
          height="48"
          :src="book.seller.avatarUrl || 'https://img.yzcdn.cn/vant/user-inactive.png'"
        />
        <div class="seller-detail">
          <div class="seller-name">
            {{ book.seller.name || '匿名用户' }}
            <span v-if="book.seller.positiveRatingRate < 60" class="risk-badge">风险提示</span>
          </div>
          <div class="seller-department">
            {{ book.seller.department || '未填写院系' }}
            <span class="rating-badge" v-if="book.seller.totalReviews > 0">
              好评率 {{ book.seller.positiveRatingRate }}%
            </span>
          </div>
        </div>
        <van-button type="primary" size="small" round @click="viewReviews">评价({{ book.seller.totalReviews }})</van-button>
      </div>
      
      <div class="bottom-actions">
        <van-button icon="star-o" :type="isFavorite ? 'warning' : 'default'" @click="toggleFavorite">
          {{ isFavorite ? '已收藏' : '收藏' }}
        </van-button>
        <van-button
          type="primary"
          block
          :disabled="book.status !== 'available' || isOwner"
          @click="contactSeller"
        >
          {{ isOwner ? '这是我发布的' : '联系卖家' }}
        </van-button>
      </div>
    </div>
    
    <van-empty v-else description="书籍不存在" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { showToast, showDialog } from 'vant';
import { getBookById, toggleFavorite as apiToggleFavorite } from '@/api/book';
import { useAuthStore } from '@/store/auth';
import type { Book } from '@/types';
import { conditionMap, categoryMap, tradeMethodMap } from '@/types';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const loading = ref(true);
const book = ref<Book | null>(null);
const isFavorite = ref(false);

const isOwner = computed(() => {
  return book.value?.sellerId === authStore.user?.id;
});

const fetchBook = async () => {
  loading.value = true;
  try {
    book.value = await getBookById(route.params.id as string);
  } finally {
    loading.value = false;
  }
};

const toggleFavorite = async () => {
  if (!authStore.isAuthenticated) {
    router.push('/login');
    return;
  }
  try {
    const result = await apiToggleFavorite(book.value!.id);
    isFavorite.value = result.isFavorite;
    showToast(result.isFavorite ? '收藏成功' : '已取消收藏');
  } catch {}
};

const contactSeller = () => {
  if (!authStore.isAuthenticated) {
    router.push('/login');
    return;
  }
  if (!book.value?.seller) return;
  router.push(`/chat/${book.value.seller.id}?bookId=${book.value.id}`);
};

const viewReviews = () => {
  if (!book.value?.seller) return;
  showDialog({
    title: '卖家评价',
    message: '请在个人中心查看更多评价功能',
  });
};

onMounted(fetchBook);
</script>

<style scoped>
.loading-center {
  display: flex;
  justify-content: center;
  padding: 100px;
}
.detail-images {
  width: 100%;
  height: 300px;
}
.detail-header {
  padding: 16px;
}
.detail-title {
  font-size: 18px;
  font-weight: 500;
  color: #1a1a1a;
}
.detail-price-section {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.detail-price {
  font-size: 24px;
  font-weight: bold;
  color: #ff4d4f;
}
.detail-original-price {
  font-size: 14px;
  color: #999;
  text-decoration: line-through;
}
.detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
.detail-meta-item {
  font-size: 13px;
  color: #666;
  background: #f7f8fa;
  padding: 4px 8px;
  border-radius: 4px;
}
.detail-desc {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}
.detail-desc h4 {
  font-size: 14px;
  color: #1a1a1a;
  margin-bottom: 8px;
}
.detail-desc p {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
}
.detail-seller {
  display: flex;
  align-items: center;
  padding: 16px;
  border-top: 8px solid #f7f8fa;
}
.seller-detail {
  flex: 1;
  margin-left: 12px;
}
.seller-name {
  font-size: 15px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
}
.risk-badge {
  font-size: 11px;
  padding: 2px 6px;
  background: #fff1f0;
  color: #f5222d;
  border-radius: 4px;
}
.seller-department {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.rating-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  background: #fff7e6;
  color: #fa8c16;
}
.status-available {
  background: #52c41a !important;
}
.status-reserved {
  background: #faad14 !important;
}
.status-sold {
  background: #d9d9d9 !important;
}
.bottom-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px;
  background: white;
  display: flex;
  gap: 12px;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
}
</style>
