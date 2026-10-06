<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useRouter, RouterLink } from 'vue-router'


const router = useRouter()
const auth = useAuthStore()

const username = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')

async function onSubmit() {
  error.value = ''
  if (!username.value.trim() || !password.value) {
    error.value = 'กรุณากรอก Username และ Password'
    return
  }
  loading.value = true
  try {
    await auth.login(username.value.trim(), password.value)
    router.push(auth.isAdmin ? '/admin/products' : '/')
  } catch (e) {
    error.value = e.response?.data?.message || 'ไม่สามารถเข้าสู่ระบบได้'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-green-50 p-4">
    <form @submit.prevent="onSubmit" class="w-full max-w-sm bg-white rounded-2xl shadow p-8 space-y-4">
      <h1 class="text-2xl font-bold text-green-700 text-center">Probiotic Shop</h1>
      <p class="text-center text-gray-500 text-sm">เข้าสู่ระบบ</p>

      <div v-if="error" class="bg-red-50 text-red-600 text-sm rounded p-2">{{ error }}</div>

      <div>
        <label class="block text-sm mb-1">Username</label>
        <input v-model="username" type="text" autocomplete="username"
          class="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400" />
      </div>

      <div>
        <label class="block text-sm mb-1">Password</label>
        <div class="relative">
          <input v-model="password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password"
            class="w-full border rounded-lg px-3 py-2 pr-16 focus:outline-none focus:ring-2 focus:ring-green-400" />
          <button type="button" @click="showPassword = !showPassword"
            class="absolute right-3 top-2 text-sm text-gray-500">
            {{ showPassword ? 'ซ่อน' : 'แสดง' }}
          </button>
        </div>
      </div>

      <button :disabled="loading"
        class="w-full bg-green-600 hover:bg-green-700 text-white rounded-lg py-2 disabled:opacity-60">
        {{ loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ' }}
      </button>

      <div class="flex justify-between text-sm">
        <a href="#" class="text-green-700">ลืมรหัสผ่าน?</a>
        <RouterLink to="/register" class="text-green-700">สมัครสมาชิก</RouterLink>
      </div>
    </form>
  </div>
</template>