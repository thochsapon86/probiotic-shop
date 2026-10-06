<script setup>
import { ref, computed } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import Swal from 'sweetalert2'
import http from '../api/http'

const router = useRouter()

const form = ref({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  full_name: '',
  phone: '',
  address: '',
})
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')

// เงื่อนไข password (แสดงแบบ checklist สดๆ)
const rules = computed(() => [
  { label: 'อย่างน้อย 8 ตัวอักษร', ok: form.value.password.length >= 8 },
  { label: 'ตัวพิมพ์เล็ก (a-z)', ok: /[a-z]/.test(form.value.password) },
  { label: 'ตัวพิมพ์ใหญ่ (A-Z)', ok: /[A-Z]/.test(form.value.password) },
  { label: 'ตัวเลข (0-9)', ok: /[0-9]/.test(form.value.password) },
  { label: 'อักขระพิเศษ (@ # ! $ ...)', ok: /[^A-Za-z0-9]/.test(form.value.password) },
])
const passwordValid = computed(() => rules.value.every((r) => r.ok))
const passwordMatch = computed(
  () => form.value.confirmPassword !== '' && form.value.password === form.value.confirmPassword
)

async function onSubmit() {
  error.value = ''
  const f = form.value

    f.username = f.username.trim()
  f.email = f.email.trim()
  f.full_name = f.full_name.trim()
  f.phone = f.phone.trim()

  if (!/^[A-Za-z0-9_]{4,20}$/.test(f.username)) {
    error.value = 'Username ต้องเป็น a-z, 0-9, _ ความยาว 4-20 ตัว'
    return
  }
  if (!/^\S+@\S+\.\S+$/.test(f.email)) {
    error.value = 'รูปแบบอีเมลไม่ถูกต้อง'
    return
  }
  if (!f.full_name.trim()) {
    error.value = 'กรุณากรอกชื่อ-นามสกุล'
    return
  }
  if (f.phone && !/^[0-9]{9,10}$/.test(f.phone)) {
    error.value = 'เบอร์โทรต้องเป็นตัวเลข 9-10 หลัก'
    return
  }
  if (!passwordValid.value) {
    error.value = 'Password ยังไม่ตรงตามเงื่อนไข'
    return
  }
  if (!passwordMatch.value) {
    error.value = 'Password และการยืนยัน Password ไม่ตรงกัน'
    return
  }

  loading.value = true
  try {
    const { confirmPassword, ...payload } = f
    await http.post('/auth/register', payload)
    await Swal.fire({
      icon: 'success',
      title: 'สมัครสมาชิกสำเร็จ',
      text: 'กรุณาเข้าสู่ระบบด้วย Username และ Password ของคุณ',
      confirmButtonColor: '#16a34a',
    })
    router.push('/login')
  } catch (e) {
    error.value = e.response?.data?.message || 'ไม่สามารถสมัครสมาชิกได้'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-green-50 p-4">
    <form @submit.prevent="onSubmit" class="w-full max-w-md bg-white rounded-2xl shadow p-8 space-y-4">
      <h1 class="text-2xl font-bold text-green-700 text-center">Probiotic Shop</h1>
      <p class="text-center text-gray-500 text-sm">สมัครสมาชิก</p>

      <div v-if="error" class="bg-red-50 text-red-600 text-sm rounded p-2">{{ error }}</div>

      <div>
        <label class="block text-sm mb-1">Username *</label>
        <input v-model="form.username" type="text" autocomplete="username"
          class="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400" />
      </div>

      <div>
        <label class="block text-sm mb-1">อีเมล *</label>
        <input v-model="form.email" type="email" autocomplete="email"
          class="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400" />
      </div>

      <div>
        <label class="block text-sm mb-1">ชื่อ-นามสกุล *</label>
        <input v-model="form.full_name" type="text"
          class="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400" />
      </div>

      <div>
        <label class="block text-sm mb-1">เบอร์โทร</label>
        <input v-model="form.phone" type="tel" maxlength="10"
          class="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400" />
      </div>

      <div>
        <label class="block text-sm mb-1">ที่อยู่จัดส่ง</label>
        <textarea v-model="form.address" rows="2"
          class="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"></textarea>
      </div>

      <div>
        <label class="block text-sm mb-1">Password *</label>
        <div class="relative">
          <input v-model="form.password" :type="showPassword ? 'text' : 'password'" autocomplete="new-password"
            class="w-full border rounded-lg px-3 py-2 pr-16 focus:outline-none focus:ring-2 focus:ring-green-400" />
          <button type="button" @click="showPassword = !showPassword"
            class="absolute right-3 top-2 text-sm text-gray-500">
            {{ showPassword ? 'ซ่อน' : 'แสดง' }}
          </button>
        </div>
        <ul class="mt-2 space-y-1 text-xs">
          <li v-for="r in rules" :key="r.label" :class="r.ok ? 'text-green-600' : 'text-gray-400'">
            {{ r.ok ? '✓' : '○' }} {{ r.label }}
          </li>
        </ul>
      </div>

      <div>
        <label class="block text-sm mb-1">ยืนยัน Password *</label>
        <input v-model="form.confirmPassword" :type="showPassword ? 'text' : 'password'" autocomplete="new-password"
          class="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400" />
        <p v-if="form.confirmPassword" class="text-xs mt-1" :class="passwordMatch ? 'text-green-600' : 'text-red-500'">
          {{ passwordMatch ? '✓ Password ตรงกัน' : 'Password ไม่ตรงกัน' }}
        </p>
      </div>

      <button :disabled="loading"
        class="w-full bg-green-600 hover:bg-green-700 text-white rounded-lg py-2 disabled:opacity-60">
        {{ loading ? 'กำลังสมัครสมาชิก...' : 'สมัครสมาชิก' }}
      </button>

      <p class="text-center text-sm">
        มีบัญชีอยู่แล้ว?
        <RouterLink to="/login" class="text-green-700">เข้าสู่ระบบ</RouterLink>
      </p>
    </form>
  </div>
</template>