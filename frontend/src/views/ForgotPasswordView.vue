<script setup>
// หน้าขอ Reset Password โดยส่งอีเมลให้ Backend
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import http from '../api/http'

const email = ref('')
const loading = ref(false)
const message = ref('')
const error = ref('')

async function submit() {
  // ส่ง email ไปขอลิงก์ reset; Backend จะตอบข้อความกลางเพื่อป้องกัน account enumeration
  error.value = ''
  message.value = ''
  loading.value = true
  try {
    const { data } = await http.post('/auth/forgot-password', { email: email.value.trim() })
    message.value = data.message
  } catch (e) {
    error.value = e.response?.data?.message || 'ไม่สามารถส่งคำขอได้'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-green-50 p-4">
    <form @submit.prevent="submit" class="w-full max-w-sm bg-white rounded-2xl shadow p-8 space-y-4">
      <h1 class="text-2xl font-bold text-green-700 text-center">ลืมรหัสผ่าน</h1>
      <p class="text-center text-gray-500 text-sm">กรอกอีเมลที่ลงทะเบียนไว้</p>
      <div v-if="message" class="bg-green-50 text-green-700 text-sm rounded p-3">{{ message }}</div>
      <div v-if="error" class="bg-red-50 text-red-600 text-sm rounded p-3">{{ error }}</div>
      <input v-model="email" type="email" required autocomplete="email" placeholder="อีเมล"
        class="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400" />
      <button :disabled="loading" class="w-full bg-green-600 hover:bg-green-700 text-white rounded-lg py-2 disabled:opacity-60">
        {{ loading ? 'กำลังส่ง...' : 'ส่งลิงก์รีเซ็ต' }}
      </button>
      <RouterLink to="/login" class="block text-center text-sm text-green-700">กลับไปหน้าเข้าสู่ระบบ</RouterLink>
    </form>
  </div>
</template>
