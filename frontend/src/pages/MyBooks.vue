<template>
  <div class="page-container">
    <van-nav-bar title="我发布的" left-arrow @click-left="router.back" />

    <van-loading v-if="loading" class="loading-center" />

    <div v-else-if="books.length > 0" class="books-list">
      <div v-for="book in books" :key="book.id" class="book-item">
        <van-image :src="book.images[0]" width="80" height="80" fit="cover" />
        <div class="book-info">
          <div class="book-title">{{ book.title }}</div>
          <div class="book-price">¥{{ book.price }}</div>
          <div class="book-status" :class="`status-${book.status}`">{{ statusMap[book.status] }}</div>
        </div>
        <van-dropdown-menu class="book-actions">
          <van-dropdown-item :options="getStatusActions(book)" @change="(val: any) => handleAction(book, val)" />
        </van-dropdown-menu>
      </div>
    </div>

    <van-empty v-else description="暂无发布的书籍">
      <van-button type="primary" @click="router.push('/publish')">去发布</van-button>
    </van-empty>

    <van-popup v-model:show="showBuyerPicker" position="bottom" round :style="{ maxHeight: '70%' }">
      <div class="buyer-picker">
        <div class="buyer-picker-title">选择买家</div>
        <div class="buyer-picker-tip">只有聊过这本书的同学才能选为买家</div>
        <van-radio-group v-model="selectedBuyerId">
          <van-cell
            v-for="user in chatUsers"
            :key="user.id"
            clickable
            @click="selectedBuyerId = user.id"
          >
            <template #title>
              <div class="buyer-cell">
                <van-image
                  round
                  width="36"
                  height="36"
                  :src="user.avatarUrl || 'https://img.yzcdn.cn/vant/user-inactive.png'"
                />
                <div class="buyer-info">
                  <div class="buyer-name">{{ user.name || '匿名用户' }}</div>
                  <div class="buyer-meta">{{ user.department || '未填写院系' }} · 学号 {{ user.studentId }}</div>
                </div>
              </div>
            </template>
            <template #right-icon>
              <van-radio :name="user.id" />
            </template>
          </van-cell>
        </van-radio-group>
        <van-button
          type="primary"
          block
          round
          class="buyer-confirm"
          :loading="marking"
          :disabled="!selectedBuyerId"
          @click="confirmSold"
        >
          确认售出
        </van-button>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { showConfirmDialog, showToast } from 'vant';
import { getMyBooks, updateBookStatus, deleteBook } from '@/api/book';
import { getBookChatUsers } from '@/api/transaction';
import type { Book, BookStatus, User } from '@/types';
import { statusMap } from '@/types';

const router = useRouter();
const loading = ref(true);
const books = ref<Book[]>([]);

const showBuyerPicker = ref(false);
const chatUsers = ref<User[]>([]);
const selectedBuyerId = ref('');
const currentBook = ref<Book | null>(null);
const marking = ref(false);

const fetchBooks = async () => {
  loading.value = true;
  try {
    books.value = await getMyBooks();
  } finally {
    loading.value = false;
  }
};

const getStatusActions = (book: Book) => {
  const actions: any[] = [{ text: '查看详情', value: 'view' }];

  if (book.status === 'available') {
    actions.push({ text: '标记为已预约', value: 'reserved' });
    actions.push({ text: '标记为已售出', value: 'sold' });
  } else if (book.status === 'reserved') {
    actions.push({ text: '恢复可购买', value: 'available' });
    actions.push({ text: '标记为已售出', value: 'sold' });
  }

  actions.push({ text: '删除', value: 'delete' });
  return actions;
};

const handleAction = async (book: Book, value: string) => {
  if (value === 'view') {
    router.push(`/book/${book.id}`);
    return;
  }

  if (value === 'delete') {
    try {
      await showConfirmDialog({
        title: '确认删除',
        message: '删除后无法恢复，确定要删除吗？',
      });
      await deleteBook(book.id);
      showToast('删除成功');
      fetchBooks();
    } catch {}
    return;
  }

  if (value === 'sold') {
    try {
      const users = await getBookChatUsers(book.id);
      if (users.length === 0) {
        showToast('暂无聊过这本书的同学，无法选定买家');
        return;
      }
      chatUsers.value = users;
      selectedBuyerId.value = '';
      currentBook.value = book;
      showBuyerPicker.value = true;
    } catch {}
    return;
  }

  try {
    await updateBookStatus(book.id, value as BookStatus);
    showToast('状态已更新');
    fetchBooks();
  } catch {}
};

const confirmSold = async () => {
  if (!currentBook.value || !selectedBuyerId.value) return;
  marking.value = true;
  try {
    await updateBookStatus(currentBook.value.id, 'sold', selectedBuyerId.value);
    showToast('已标记售出，等待买家确认收货');
    showBuyerPicker.value = false;
    fetchBooks();
  } catch {} finally {
    marking.value = false;
  }
};

onMounted(fetchBooks);
</script>

<style scoped>
.loading-center {
  display: flex;
  justify-content: center;
  padding: 100px;
}
.books-list {
  padding: 12px;
}
.book-item {
  display: flex;
  background: white;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  align-items: center;
}
.book-info {
  flex: 1;
  margin-left: 12px;
}
.book-title {
  font-size: 14px;
  color: #1a1a1a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.book-price {
  font-size: 16px;
  font-weight: bold;
  color: #ff4d4f;
  margin-top: 4px;
}
.book-status {
  font-size: 12px;
  margin-top: 4px;
}
.status-available {
  color: #52c41a;
}
.status-reserved {
  color: #faad14;
}
.status-sold {
  color: #999;
}
.book-actions {
  width: 80px;
}
.buyer-picker {
  padding: 20px 16px 24px;
}
.buyer-picker-title {
  font-size: 16px;
  font-weight: 500;
  text-align: center;
}
.buyer-picker-tip {
  font-size: 12px;
  color: #999;
  text-align: center;
  margin: 8px 0 16px;
}
.buyer-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}
.buyer-name {
  font-size: 14px;
  color: #1a1a1a;
}
.buyer-meta {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}
.buyer-confirm {
  margin-top: 16px;
}
</style>
