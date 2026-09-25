<template>
  <div class="page-container">
    <van-nav-bar title="发布书籍" left-arrow @click-left="router.back" />
    
    <van-form @submit="onSubmit">
      <van-cell-group inset>
        <van-field
          v-model="form.title"
          name="title"
          label="书名"
          placeholder="请输入书名"
          :rules="[{ required: true, message: '请输入书名' }]"
        />
        <van-field
          v-model="form.author"
          name="author"
          label="作者"
          placeholder="请输入作者"
          :rules="[{ required: true, message: '请输入作者' }]"
        />
        <van-field v-model="form.isbn" name="isbn" label="ISBN" placeholder="选填" />
        
        <van-field name="images" label="图片" required>
          <template #input>
            <van-uploader
              v-model="fileList"
              :max-count="5"
              :max-size="5 * 1024 * 1024"
              accept="image/*"
            />
          </template>
        </van-field>
        
        <van-field v-model.number="form.originalPrice" type="number" name="originalPrice" label="原价" placeholder="¥">
          <template #left-icon>
            <van-icon name="balance-o" />
          </template>
        </van-field>
        <van-field v-model.number="form.price" type="number" name="price" label="售价" placeholder="¥">
          <template #left-icon>
            <van-icon name="balance-o" />
          </template>
        </van-field>
        
        <van-field name="condition" label="新旧程度" :rules="[{ required: true, message: '请选择新旧程度' }]">
          <template #input>
            <van-radio-group v-model="form.condition" direction="horizontal">
              <van-radio name="new">全新</van-radio>
              <van-radio name="like_new">九成新</van-radio>
              <van-radio name="good">七成新</van-radio>
              <van-radio name="fair">五成新</van-radio>
            </van-radio-group>
          </template>
        </van-field>
        
        <van-field name="tradeMethod" label="交易方式" :rules="[{ required: true, message: '请选择交易方式' }]">
          <template #input>
            <van-radio-group v-model="form.tradeMethod" direction="horizontal">
              <van-radio name="meetup">面交</van-radio>
              <van-radio name="shipping">邮寄</van-radio>
            </van-radio-group>
          </template>
        </van-field>
        
        <van-field name="campus" label="校区" placeholder="请输入校区" :rules="[{ required: true, message: '请输入校区' }]">
          <template #input>
            <van-picker
              :columns="campuses"
              @confirm="onCampusConfirm"
              v-model:show="showCampusPicker"
            >
              <template #title>选择校区</template>
            </van-picker>
            <div @click="showCampusPicker = true">{{ form.campus || '请选择' }}</div>
          </template>
        </van-field>
        
        <van-field name="category" label="分类" :rules="[{ required: true, message: '请选择分类' }]">
          <template #input>
            <van-radio-group v-model="form.category" direction="horizontal">
              <van-radio name="science">理工</van-radio>
              <van-radio name="humanities">文史</van-radio>
              <van-radio name="business">经管</van-radio>
              <van-radio name="arts">艺术</van-radio>
              <van-radio name="other">其他</van-radio>
            </van-radio-group>
          </template>
        </van-field>
        
        <van-field
          v-model="form.description"
          name="description"
          label="描述"
          type="textarea"
          placeholder="请输入书籍描述"
          rows="3"
        />
      </van-cell-group>
      
      <div class="submit-actions">
        <van-button round block type="primary" native-type="submit" :loading="loading">
          发布
        </van-button>
      </div>
    </van-form>
    
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
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { showToast } from 'vant';
import { createBook } from '@/api/book';
import type { UploaderFileListItem } from 'vant';

const router = useRouter();
const activeTab = ref(2);
const loading = ref(false);
const showCampusPicker = ref(false);

const fileList = ref<UploaderFileListItem[]>([]);

const form = reactive({
  title: '',
  author: '',
  isbn: '',
  originalPrice: 0,
  price: 0,
  condition: '',
  tradeMethod: '',
  campus: '',
  category: '',
  description: '',
});

const campuses = [
  { text: '主校区', value: '主校区' },
  { text: '东校区', value: '东校区' },
  { text: '西校区', value: '西校区' },
  { text: '南校区', value: '南校区' },
  { text: '北校区', value: '北校区' },
];

const onCampusConfirm = ({ selectedOptions }: any) => {
  form.campus = selectedOptions[0]?.text || '';
  showCampusPicker.value = false;
};

const onSubmit = async () => {
  if (fileList.value.length === 0) {
    showToast('请上传至少一张图片');
    return;
  }
  
  const files = fileList.value
    .filter((item) => item.file)
    .map((item) => item.file as File);
  
  if (files.length === 0) {
    showToast('图片上传中，请稍候');
    return;
  }
  
  loading.value = true;
  try {
    await createBook({
      title: form.title,
      author: form.author,
      isbn: form.isbn || undefined,
      originalPrice: form.originalPrice,
      price: form.price,
      condition: form.condition as any,
      tradeMethod: form.tradeMethod as any,
      campus: form.campus,
      category: form.category as any,
      description: form.description || undefined,
      images: files,
    });
    showToast('发布成功');
    router.replace('/my-books');
  } catch {
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.submit-actions {
  padding: 24px;
}
</style>
