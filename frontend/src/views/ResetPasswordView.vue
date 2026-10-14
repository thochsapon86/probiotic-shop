<script setup>
import { ref } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import http from '../api/http'

const route = useRoute()
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const success = ref(false)

async function submit() {
  error.value = ''
  if (password.value !== confirmPassword.value) {
    error.value = 'รหัสผ่านไม่ตรงกัน'
    return
  }
  loading.value = true
  try {
    await http.post('/auth/reset-password', { token: route.query.token, password: password.value })
    success.value = true
  } catch (e) {
    error.value = e.response?.data?.message || 'ไม่สามารถตั้งรหัสผ่านใหม่ได้'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-green-50 p-4">
    <form v-if="!success" @submit.prevent="submit" class="w-full max-w-sm bg-white rounded-2xl shadow p-8 space-y-4">
      <h1 class="text-2xl font-bold text-green-700 text-center">ตั้งรหัสผ่านใหม่</h1>
      <div v-if="error" class="bg-red-50 text-red-600 text-sm rounded p-3">{{ error }}</div>
      <input v-model="password" type="password" required minlength="8" autocomplete="new-password" placeholder="รหัสผ่านใหม่"
        class="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400" />
      <p class="text-xs text-gray-500">ต้องมีตัวพิมพ์เล็ก ตัวพิมพ์ใหญ่ ตัวเลข และอักขระพิเศษ</p>
      <input v-model="confirmPassword" type="password" required minlength="8" autocomplete="new-password" placeholder="ยืนยันรหัสผ่าน"
        class="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400" />
      <button :disabled="loading" class="w-full bg-green-600 hover:bg-green-700 text-white rounded-lg py-2 disabled:opacity-60">
        {{ loading ? 'กำลังบันทึก...' : 'ตั้งรหัสผ่านใหม่' }}
      </button>
    </form>
    <div v-else class="w-full max-w-sm bg-white rounded-2xl shadow p-8 space-y-4 text-center">
      <h1 class="text-2xl font-bold text-green-700">ตั้งรหัสผ่านสำเร็จ</h1>
      <p class="text-sm text-gray-600">กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่</p>
      <RouterLink to="/login" class="block bg-green-600 text-white rounded-lg py-2">เข้าสู่ระบบ</RouterLink>
    </div>
  </div>
</template>
