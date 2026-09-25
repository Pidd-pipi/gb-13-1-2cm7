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
      <div class="picker-header">选择成交买家</div>
      <van-loading v-if="candidatesLoading" class="loading-center" />
      <template v-else>
        <div v-if="candidates.length > 0" class="candidate-list">
          <div
            v-for="candidate in candidates"
            :key="candidate.id"
            class="candidate-item"
            @click="selectBuyer(candidate)"
          >
            <van-image round width="40" height="40" :src="candidate.avatarUrl || defaultAvatar" />
            <div class="candidate-info">
              <div class="candidate-name">{{ candidate.name || '匿名用户' }}</div>
              <div class="candidate-dept" v-if="candidate.department">{{ candidate.department }}</div>
            </div>
          </div>
        </div>
        <van-empty v-else description="还没有同学就这本书与你聊过天" />
      </template>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { showConfirmDialog, showToast } from 'vant';
import { getMyBooks, updateBookStatus, deleteBook } from '@/api/book';
import { getBuyerCandidates, markBookSold } from '@/api/review';
import type { Book, BookStatus, BuyerCandidate } from '@/types';
import { statusMap } from '@/types';

const router = useRouter();
const loading = ref(true);
const books = ref<Book[]>([]);
const defaultAvatar = 'https://img.yzcdn.cn/vant/user-inactive.png';

const showBuyerPicker = ref(false);
const candidatesLoading = ref(false);
const candidates = ref<BuyerCandidate[]>([]);
const sellingBook = ref<Book | null>(null);

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

  actions.push({ text: '删除', value: 'delete', disabled: book.status === 'sold' });
  return actions;
};

const openBuyerPicker = async (book: Book) => {
  sellingBook.value = book;
  showBuyerPicker.value = true;
  candidatesLoading.value = true;
  try {
    candidates.value = await getBuyerCandidates(book.id);
  } catch {
    candidates.value = [];
  } finally {
    candidatesLoading.value = false;
  }
};

const selectBuyer = async (candidate: BuyerCandidate) => {
  const book = sellingBook.value;
  if (!book) return;
  try {
    await showConfirmDialog({
      title: '确认成交',
      message: `确认将《${book.title}》售出给 ${candidate.name || '该同学'} 吗？提交后等待买家确认收货。`,
    });
  } catch {
    return;
  }
  try {
    await markBookSold(book.id, candidate.id);
    showToast('已标记售出，等待买家确认');
    showBuyerPicker.value = false;
    fetchBooks();
  } catch {}
};

const handleAction = async (book: Book, value: string) => {
  if (value === 'view') {
    router.push(`/book/${book.id}`);
    return;
  }

  if (value === 'sold') {
    openBuyerPicker(book);
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

  try {
    await updateBookStatus(book.id, value as BookStatus);
    showToast('状态已更新');
    fetchBooks();
  } catch {}
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
.picker-header {
  text-align: center;
  font-size: 16px;
  font-weight: 500;
  padding: 16px;
}
.candidate-list {
  padding: 0 16px 16px;
}
.candidate-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  background: #f7f8fa;
  margin-bottom: 10px;
}
.candidate-info {
  margin-left: 12px;
}
.candidate-name {
  font-size: 15px;
  color: #1a1a1a;
}
.candidate-dept {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}
</style>
