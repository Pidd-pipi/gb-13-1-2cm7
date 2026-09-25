<template>
  <div class="page-container">
    <van-nav-bar title="登录" left-arrow @click-left="goBack" />
    <van-form @submit="onSubmit">
      <div class="login-content">
        <div class="logo-section">
          <van-icon name="shopping-cart-o" size="80" color="#1989fa" />
          <h2>校园二手书交易平台</h2>
        </div>
        <van-cell-group inset>
          <van-field
            v-model="form.email"
            name="email"
            label="邮箱"
            placeholder="请输入学校邮箱"
            :rules="emailRules"
          />
          <van-field
            v-model="form.password"
            type="password"
            name="password"
            label="密码"
            placeholder="请输入密码"
            :rules="[{ required: true, message: '请输入密码' }]"
          />
        </van-cell-group>
        <div class="login-actions">
          <van-button round block type="primary" native-type="submit" :loading="loading">
            登录
          </van-button>
          <div class="register-link">
            还没有账号？
            <router-link to="/register">立即注册</router-link>
          </div>
        </div>
      </div>
    </van-form>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { showToast } from 'vant';
import { login } from '@/api/auth';
import { useAuthStore } from '@/store/auth';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const loading = ref(false);

const form = reactive({
  email: '',
  password: '',
});

const emailRules = [
  { required: true, message: '请输入邮箱' },
  {
    validator: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message: '邮箱格式错误',
  },
];

const goBack = () => {
  router.back();
};

const onSubmit = async () => {
  loading.value = true;
  try {
    const result = await login(form.email, form.password);
    authStore.setToken(result.token);
    authStore.setUser(result.user);
    showToast('登录成功');
    const redirect = route.query.redirect as string;
    router.replace(redirect || '/home');
  } catch {
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.login-content {
  padding: 24px;
}
.logo-section {
  text-align: center;
  padding: 40px 0;
}
.logo-section h2 {
  margin-top: 16px;
  font-size: 20px;
  color: #1a1a1a;
  font-weight: 500;
}
.login-actions {
  margin-top: 24px;
}
.register-link {
  text-align: center;
  margin-top: 16px;
  color: #999;
  font-size: 14px;
}
.register-link a {
  color: #1989fa;
}
</style>
