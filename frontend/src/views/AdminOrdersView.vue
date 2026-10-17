<script setup>
// หน้า Admin สำหรับค้นหาและตรวจสอบออเดอร์ของลูกค้าตามสถานะ
import AppNavbar from '../components/AppNavBar.vue'
import { onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import http from '../api/http'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const orders = ref([])
const search = ref('')
const status = ref('')
const loading = ref(true)
const error = ref('')

const baht = (value) => Number(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })
const dateText = (value) => new Date(value).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })
const statusText = { pending: 'รอชำระเงิน', paid: 'ชำระเงินแล้ว', cancelled: 'ยกเลิกแล้ว' }
const statusClass = {
  pending: 'bg-yellow-50 text-yellow-700',
  paid: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-700',
}

async function loadOrders() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await http.get('/orders', { params: { search: search.value, status: status.value } })
    orders.value = data
  } catch (e) {
    if (e.response?.status === 401) {
      auth.logout()
      return router.push('/login')
    }
    if (e.response?.status === 403) return router.push('/')
    error.value = e.response?.data?.message || 'ไม่สามารถโหลดรายการออร์เดอร์ได้'
  } finally {
    loading.value = false
  }
}

let timer
watch(search, () => {
  clearTimeout(timer)
  timer = setTimeout(loadOrders, 350)
})
watch(status, loadOrders)
onMounted(loadOrders)
</script>

<template>
  <div class="min-h-screen bg-[#F6F9F4] text-[#17302A]">
    <AppNavbar />
    <main class="max-w-6xl mx-auto px-5 py-8">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="text-sm text-[#3E5A52]">สำหรับผู้ดูแลระบบ</p>
          <h1 class="text-3xl font-bold">รายการออร์เดอร์</h1>
        </div>
        <div class="flex flex-wrap gap-2">
          <input v-model="search" type="search" placeholder="ค้นหาเลขออร์เดอร์/Username"
            class="border rounded-full px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-green-400" />
          <select v-model="status" class="border rounded-full px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-green-400">
            <option value="">ทุกสถานะ</option>
            <option value="pending">รอชำระเงิน</option>
            <option value="paid">ชำระเงินแล้ว</option>
            <option value="cancelled">ยกเลิกแล้ว</option>
          </select>
        </div>
      </div>

      <p v-if="error" class="mt-6 bg-red-50 text-red-600 rounded p-3 text-sm">{{ error }}</p>
      <p v-else-if="loading" class="mt-10 text-gray-500">กำลังโหลดรายการออร์เดอร์...</p>
      <p v-else-if="orders.length === 0" class="mt-10 text-gray-500">ไม่พบรายการออร์เดอร์</p>

      <div v-else class="mt-8 bg-white rounded-2xl overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-[#E3F0E6] text-left">
            <tr>
              <th class="px-4 py-3">ออร์เดอร์</th>
              <th class="px-4 py-3">ลูกค้า</th>
              <th class="px-4 py-3">วันที่</th>
              <th class="px-4 py-3 text-right">ยอดรวม</th>
              <th class="px-4 py-3">สถานะ</th>
              <th class="px-4 py-3">รายละเอียด</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr v-for="order in orders" :key="order.order_id">
              <td class="px-4 py-3 font-medium">#{{ order.order_id }}</td>
              <td class="px-4 py-3">
                <div>{{ order.full_name || order.username }}</div>
                <div class="text-xs text-gray-500">{{ order.email }}</div>
              </td>
              <td class="px-4 py-3 whitespace-nowrap">{{ dateText(order.order_date) }}</td>
              <td class="px-4 py-3 text-right whitespace-nowrap">฿{{ baht(order.total_amount) }}</td>
              <td class="px-4 py-3 whitespace-nowrap">
                <span class="rounded-full px-3 py-1 text-xs" :class="statusClass[order.status]">{{ statusText[order.status] }}</span>
              </td>
              <td class="px-4 py-3"><RouterLink :to="`/orders/${order.order_id}`" class="text-[#14532D] hover:underline">ดูออร์เดอร์</RouterLink></td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  </div>
</template>
