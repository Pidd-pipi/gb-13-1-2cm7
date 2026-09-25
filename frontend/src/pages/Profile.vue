<template>
  <div class="page-container">
    <van-nav-bar title="个人中心" />

    <div class="profile-header">
      <div class="user-info">
        <van-image
          round
          width="72"
          height="72"
          :src="authStore.user?.avatarUrl || 'https://img.yzcdn.cn/vant/user-inactive.png'"
        />
        <div class="user-detail">
          <div class="user-name">{{ authStore.user?.name || authStore.user?.email?.split('@')[0] || '未设置昵称' }}</div>
          <div class="user-meta">
            <span v-if="authStore.user?.department">{{ authStore.user.department }}</span>
            <span v-if="authStore.user?.totalReviews" class="rating">好评率 {{ formatRate(authStore.user.positiveRatingRate) }}%</span>
          </div>
        </div>
      </div>
      <van-button type="primary" size="small" round @click="editProfile">编辑资料</van-button>
    </div>

    <van-cell-group inset title="交易评价">
      <div v-if="transactions.length === 0" class="tx-empty">暂无交易记录</div>
      <van-cell
        v-for="tx in transactions"
        :key="tx.id"
        :title="tx.book?.title || '书籍已删除'"
        :label="txLabel(tx)"
      >
        <template #value>
          <div class="tx-side">
            <div class="tx-tags">
              <van-tag v-if="tx.status === 'pending_confirm'" type="warning">待确认收货</van-tag>
              <template v-else>
                <van-tag :type="myReviewed(tx) ? 'success' : 'default'">我{{ myReviewed(tx) ? '已评价' : '未评价' }}</van-tag>
                <van-tag :type="otherReviewed(tx) ? 'success' : 'default'">对方{{ otherReviewed(tx) ? '已评价' : '未评价' }}</van-tag>
              </template>
            </div>
            <van-button
              v-if="isBuyer(tx) && tx.status === 'pending_confirm'"
              size="small"
              type="primary"
              @click="confirmReceipt(tx)"
            >确认收货</van-button>
            <van-button
              v-if="tx.status === 'completed' && !myReviewed(tx)"
              size="small"
              type="primary"
              plain
              @click="openReview(tx)"
            >去评价</van-button>
          </div>
        </template>
      </van-cell>
    </van-cell-group>

    <van-cell-group inset>
      <van-cell title="我发布的" icon="shop-o" is-link @click="router.push('/my-books')" />
      <van-cell title="我的收藏" icon="star-o" is-link @click="router.push('/favorites')" />
      <van-cell title="求购信息" icon="notes-o" is-link @click="router.push('/purchase-requests')" />
      <van-cell title="我的评价" icon="comment-o" is-link @click="showReviews" />
    </van-cell-group>

    <van-cell-group inset>
      <van-cell title="关于我们" icon="info-o" is-link @click="showAbout" />
      <van-cell title="退出登录" icon="logout" @click="logout" />
    </van-cell-group>

    <van-tabbar v-model:active="activeTab" route>
      <van-tabbar-item to="/home" icon="home-o">首页</van-tabbar-item>
      <van-tabbar-item to="/search" icon="search">搜索</van-tabbar-item>
      <van-tabbar-item to="/publish" icon="plus">发布</van-tabbar-item>
      <van-tabbar-item to="/messages" icon="chat-o">消息</van-tabbar-item>
      <van-tabbar-item to="/profile" icon="user-o">我的</van-tabbar-item>
    </van-tabbar>

    <van-popup v-model:show="showEdit" position="bottom" :style="{ height: '60%' }">
      <van-nav-bar title="编辑资料" :left-arrow="false">
        <template #right>
          <span @click="saveProfile" style="color: #1989fa">保存</span>
        </template>
      </van-nav-bar>
      <van-cell-group>
        <van-field v-model="editForm.name" label="昵称" placeholder="请输入昵称" />
        <van-field v-model="editForm.department" label="院系" placeholder="请输入院系" />
        <van-field v-model="editForm.contactInfo" label="联系方式" placeholder="请输入联系方式" />
      </van-cell-group>
    </van-popup>

    <van-popup v-model:show="showReview" position="bottom" round>
      <div class="review-panel">
        <div class="review-title">评价 {{ reviewTarget ? otherParty(reviewTarget)?.name || '匿名用户' : '' }}</div>
        <van-radio-group v-model="reviewType" direction="horizontal" class="review-types">
          <van-radio name="positive">好评</van-radio>
          <van-radio name="neutral">中评</van-radio>
          <van-radio name="negative">差评</van-radio>
        </van-radio-group>
        <van-field
          v-model="reviewContent"
          type="textarea"
          rows="3"
          maxlength="500"
          show-word-limit
          placeholder="说说这次交易体验（选填）"
        />
        <van-button type="primary" block round class="review-submit" :loading="submittingReview" @click="submitReview">
          提交评价
        </van-button>
      </div>
    </van-popup>

    <van-popup v-model:show="showMyReviews" position="bottom" round :style="{ maxHeight: '70%' }">
      <div class="my-reviews">
        <div class="review-title">我收到的评价</div>
        <van-empty v-if="myReviews.length === 0" description="暂无评价" />
        <van-cell v-for="review in myReviews" :key="review.id" :title="review.reviewer?.name || '匿名用户'">
          <template #label>
            <van-tag :type="reviewTagType(review.type)">{{ reviewTypeMap[review.type] }}</van-tag>
            <span v-if="review.content" class="review-content">{{ review.content }}</span>
          </template>
        </van-cell>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { showDialog, showToast, showConfirmDialog } from 'vant';
import { useAuthStore } from '@/store/auth';
import { updateProfile } from '@/api/auth';
import { getMyTransactions, confirmTransaction } from '@/api/transaction';
import { createReview, getUserReviews } from '@/api/review';
import type { Review, ReviewType, Transaction, User } from '@/types';
import { reviewTypeMap } from '@/types';

const router = useRouter();
const authStore = useAuthStore();
const activeTab = ref(4);
const showEdit = ref(false);

const transactions = ref<Transaction[]>([]);
const showReview = ref(false);
const reviewTarget = ref<Transaction | null>(null);
const reviewType = ref<ReviewType>('positive');
const reviewContent = ref('');
const submittingReview = ref(false);

const showMyReviews = ref(false);
const myReviews = ref<Review[]>([]);

const editForm = reactive({
  name: '',
  department: '',
  contactInfo: '',
});

const formatRate = (rate: number | string) => {
  return Number(rate).toFixed(0);
};

const editProfile = () => {
  if (authStore.user) {
    editForm.name = authStore.user.name || '';
    editForm.department = authStore.user.department || '';
    editForm.contactInfo = authStore.user.contactInfo || '';
  }
  showEdit.value = true;
};

const saveProfile = async () => {
  try {
    await updateProfile(editForm);
    await authStore.fetchCurrentUser();
    showToast('保存成功');
    showEdit.value = false;
  } catch {}
};

const fetchTransactions = async () => {
  try {
    transactions.value = await getMyTransactions();
  } catch {}
};

const isBuyer = (tx: Transaction) => tx.buyerId === authStore.user?.id;

const otherParty = (tx: Transaction): User | undefined => {
  return isBuyer(tx) ? tx.seller : tx.buyer;
};

const myReviewed = (tx: Transaction) => (isBuyer(tx) ? tx.buyerReviewed : tx.sellerReviewed);

const otherReviewed = (tx: Transaction) => (isBuyer(tx) ? tx.sellerReviewed : tx.buyerReviewed);

const txLabel = (tx: Transaction) => {
  const role = isBuyer(tx) ? '我买到的' : '我卖出的';
  const other = otherParty(tx)?.name || '匿名用户';
  return `${role} · 对方：${other}`;
};

const confirmReceipt = async (tx: Transaction) => {
  try {
    await showConfirmDialog({
      title: '确认收货',
      message: '确认已收到书籍吗？确认后双方可以互相评价',
    });
    await confirmTransaction(tx.id);
    showToast('已确认收货');
    fetchTransactions();
  } catch {}
};

const openReview = (tx: Transaction) => {
  reviewTarget.value = tx;
  reviewType.value = 'positive';
  reviewContent.value = '';
  showReview.value = true;
};

const submitReview = async () => {
  if (!reviewTarget.value) return;
  submittingReview.value = true;
  try {
    await createReview({
      bookId: reviewTarget.value.bookId,
      type: reviewType.value,
      content: reviewContent.value.trim() || undefined,
    });
    showToast('评价成功');
    showReview.value = false;
    fetchTransactions();
    authStore.fetchCurrentUser();
  } catch {} finally {
    submittingReview.value = false;
  }
};

const reviewTagType = (type: ReviewType) => {
  if (type === 'positive') return 'success';
  if (type === 'negative') return 'danger';
  return 'warning';
};

const showReviews = async () => {
  if (!authStore.user) return;
  try {
    myReviews.value = await getUserReviews(authStore.user.id);
    showMyReviews.value = true;
  } catch {}
};

const showAbout = () => {
  showDialog({
    title: '关于我们',
    message: '校园二手书交易平台 v1.0\n让书籍循环利用，降低购书成本',
  });
};

const logout = () => {
  authStore.logout();
  router.replace('/login');
};

onMounted(() => {
  if (authStore.isAuthenticated) {
    authStore.fetchCurrentUser();
    fetchTransactions();
  }
});
</script>

<style scoped>
.profile-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 24px;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.user-info {
  display: flex;
  align-items: center;
  gap: 16px;
}
.user-detail {
  flex: 1;
}
.user-name {
  font-size: 18px;
  font-weight: 500;
}
.user-meta {
  font-size: 12px;
  margin-top: 4px;
  display: flex;
  gap: 12px;
  opacity: 0.9;
}
.rating {
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 8px;
  border-radius: 10px;
}
.tx-empty {
  padding: 16px;
  font-size: 13px;
  color: #999;
  text-align: center;
}
.tx-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}
.tx-tags {
  display: flex;
  gap: 4px;
}
.review-panel {
  padding: 20px 16px 24px;
}
.review-title {
  font-size: 16px;
  font-weight: 500;
  text-align: center;
  margin-bottom: 16px;
}
.review-types {
  justify-content: center;
  margin-bottom: 16px;
}
.review-submit {
  margin-top: 16px;
}
.my-reviews {
  padding: 20px 0 24px;
}
.review-content {
  margin-left: 8px;
  color: #666;
}
</style>
