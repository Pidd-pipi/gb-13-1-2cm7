<template>
  <div class="page-container">
    <van-nav-bar title="消息" />
    
    <van-loading v-if="loading" class="loading-center" />
    
    <div v-else-if="conversations.length > 0" class="messages-list">
      <div
        v-for="msg in conversations"
        :key="msg.id"
        class="message-item"
        @click="goChat(msg)"
      >
        <van-image
          round
          width="48"
          height="48"
          :src="getOtherAvatar(msg)"
        />
        <div class="message-info">
          <div class="message-header">
            <span class="message-name">{{ getOtherName(msg) }}</span>
            <span class="message-time">{{ formatTime(msg.createdAt) }}</span>
          </div>
          <div class="message-preview">
            <span v-if="msg.imageUrls?.length" class="image-icon">[图片]</span>
            {{ msg.content }}
          </div>
        </div>
        <van-badge v-if="!msg.isRead && isReceiver(msg)" :content="1" />
      </div>
    </div>
    
    <van-empty v-else description="暂无消息" />
    
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
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/store/auth';
import { getConversations } from '@/api/message';
import type { Message } from '@/types';

const router = useRouter();
const authStore = useAuthStore();
const activeTab = ref(3);
const loading = ref(true);
const conversations = ref<Message[]>([]);

const fetchConversations = async () => {
  loading.value = true;
  try {
    conversations.value = await getConversations();
  } finally {
    loading.value = false;
  }
};

const getOtherUserId = (msg: Message) => {
  return msg.senderId === authStore.user?.id ? msg.receiverId : msg.senderId;
};

const getOtherAvatar = (_msg: Message) => {
  return 'https://img.yzcdn.cn/vant/user-inactive.png';
};

const getOtherName = (_msg: Message) => {
  return '用户';
};

const isReceiver = (msg: Message) => {
  return msg.receiverId === authStore.user?.id;
};

const formatTime = (time: string) => {
  const date = new Date(time);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 24 * 60 * 60 * 1000) {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

const goChat = (msg: Message) => {
  const otherId = getOtherUserId(msg);
  const query = msg.bookId ? `?bookId=${msg.bookId}` : '';
  router.push(`/chat/${otherId}${query}`);
};

onMounted(fetchConversations);
</script>

<style scoped>
.loading-center {
  display: flex;
  justify-content: center;
  padding: 100px;
}
.messages-list {
  background: white;
}
.message-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
}
.message-info {
  flex: 1;
  margin-left: 12px;
  overflow: hidden;
}
.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.message-name {
  font-size: 15px;
  font-weight: 500;
  color: #1a1a1a;
}
.message-time {
  font-size: 12px;
  color: #999;
}
.message-preview {
  font-size: 13px;
  color: #666;
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.image-icon {
  color: #1989fa;
  margin-right: 4px;
}
</style>
