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
            <span v-if="authStore.user?.totalReviews" class="rating">好评率 {{ authStore.user.positiveRatingRate }}%</span>
          </div>
        </div>
      </div>
      <van-button type="primary" size="small" round @click="editProfile">编辑资料</van-button>
    </div>
    
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { showDialog, showToast } from 'vant';
import { useAuthStore } from '@/store/auth';
import { updateProfile } from '@/api/auth';

const router = useRouter();
const authStore = useAuthStore();
const activeTab = ref(4);
const showEdit = ref(false);

const editForm = reactive({
  name: '',
  department: '',
  contactInfo: '',
});

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

const showReviews = () => {
  showDialog({
    title: '我的评价',
    message: '功能开发中...',
  });
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
</style>
