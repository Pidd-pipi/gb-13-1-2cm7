<template>
  <div class="page-container">
    <van-nav-bar title="注册" left-arrow @click-left="router.back" />
    <van-form @submit="onSubmit">
      <van-cell-group inset>
        <van-field
          v-model="form.email"
          name="email"
          label="邮箱"
          placeholder="请输入学校邮箱"
          :rules="emailRules"
        />
        <van-field
          v-model="form.studentId"
          name="studentId"
          label="学号"
          placeholder="请输入学号"
          :rules="[{ required: true, message: '请输入学号' }]"
        />
        <van-field
          v-model="form.password"
          type="password"
          name="password"
          label="密码"
          placeholder="请输入密码（至少6位）"
          :rules="passwordRules"
        />
        <van-field
          v-model="form.code"
          name="code"
          label="验证码"
          placeholder="请输入6位验证码"
          :rules="[{ required: true, message: '请输入验证码' }]"
        >
          <template #button>
            <van-button
              size="small"
              type="primary"
              :disabled="countdown > 0"
              @click="sendCode"
            >
              {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
            </van-button>
          </template>
        </van-field>
      </van-cell-group>
      <div class="register-actions">
        <van-button round block type="primary" native-type="submit" :loading="loading">
          注册并登录
        </van-button>
      </div>
    </van-form>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { showToast } from 'vant';
import { sendCode as apiSendCode, register } from '@/api/auth';
import { useAuthStore } from '@/store/auth';

const router = useRouter();
const authStore = useAuthStore();
const loading = ref(false);
const countdown = ref(0);

const form = reactive({
  email: '',
  studentId: '',
  password: '',
  code: '',
});

const emailRules = [
  { required: true, message: '请输入邮箱' },
  {
    validator: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message: '邮箱格式错误',
  },
];

const passwordRules = [
  { required: true, message: '请输入密码' },
  {
    validator: (value: string) => value.length >= 6,
    message: '密码至少6位',
  },
];

const sendCode = async () => {
  if (!form.email || !form.studentId) {
    showToast('请先填写邮箱和学号');
    return;
  }
  try {
    await apiSendCode(form.email, form.studentId);
    showToast('验证码已发送');
    countdown.value = 60;
    const timer = setInterval(() => {
      countdown.value--;
      if (countdown.value <= 0) {
        clearInterval(timer);
      }
    }, 1000);
  } catch {
  }
};

const onSubmit = async () => {
  loading.value = true;
  try {
    const result = await register(form);
    authStore.setToken(result.token);
    authStore.setUser(result.user);
    showToast('注册成功');
    router.replace('/home');
  } catch {
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.register-actions {
  padding: 24px;
}
</style>
