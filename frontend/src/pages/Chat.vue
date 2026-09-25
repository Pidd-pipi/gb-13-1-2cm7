<template>
  <div class="chat-page">
    <van-nav-bar title="聊天" left-arrow @click-left="router.back" />
    
    <div class="messages-container" ref="messagesContainer">
      <div v-for="msg in messages" :key="msg.id" :class="['message-row', isSelf(msg) ? 'self' : 'other']">
        <div class="message-bubble">
          <van-image v-for="(img, idx) in msg.imageUrls" :key="idx" :src="img" width="150" fit="cover" />
          <p v-if="msg.content">{{ msg.content }}</p>
        </div>
      </div>
      <van-loading v-if="loading" />
    </div>
    
    <div class="chat-input">
      <van-field
        v-model="inputText"
        placeholder="输入消息..."
        @keyup.enter="sendMessage"
      />
      <van-button type="primary" size="small" @click="sendMessage">发送</van-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { showToast } from 'vant';
import { getMessages, sendMessage as apiSendMessage } from '@/api/message';
import { useAuthStore } from '@/store/auth';
import type { Message } from '@/types';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const loading = ref(false);
const inputText = ref('');
const messages = ref<Message[]>([]);
const messagesContainer = ref<HTMLElement | null>(null);

const otherUserId = route.params.otherUserId as string;
const bookId = route.query.bookId as string | undefined;

const fetchMessages = async () => {
  loading.value = true;
  try {
    messages.value = await getMessages(otherUserId, bookId);
    nextTick(scrollToBottom);
  } finally {
    loading.value = false;
  }
};

const isSelf = (msg: Message) => {
  return msg.senderId === authStore.user?.id;
};

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

const sendMessage = async () => {
  if (!inputText.value.trim()) return;
  
  try {
    await apiSendMessage({
      receiverId: otherUserId,
      bookId,
      content: inputText.value.trim(),
    });
    inputText.value = '';
    fetchMessages();
  } catch {
    showToast('发送失败');
  }
};

onMounted(fetchMessages);
</script>

<style scoped>
.chat-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #f7f8fa;
}
.message-row {
  display: flex;
  margin-bottom: 16px;
}
.message-row.self {
  justify-content: flex-end;
}
.message-bubble {
  max-width: 70%;
  padding: 10px 14px;
  border-radius: 8px;
  background: white;
  word-break: break-word;
}
.message-row.self .message-bubble {
  background: #1989fa;
  color: white;
}
.message-bubble p {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
}
.message-bubble .van-image {
  border-radius: 4px;
  margin-bottom: 4px;
}
.chat-input {
  display: flex;
  align-items: center;
  padding: 12px;
  background: white;
  border-top: 1px solid #f0f0f0;
  gap: 8px;
}
.chat-input .van-field {
  flex: 1;
}
</style>
