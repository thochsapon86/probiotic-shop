<script setup>
// หน้ารายการออเดอร์เดิม ปัจจุบัน route จะ redirect ไป Cart ที่รวมฟังก์ชันนี้แล้ว
import AppNavbar from '../components/AppNavBar.vue'
import { onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import http from '../api/http'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()
// หน้านี้เป็น implementation เดิมของรายการ Order; route หลักปัจจุบันรวมไว้ใน Cart แล้ว
const orders = ref([])
const status = ref('')
const loading = ref(true)
const error = ref('')

const baht = (value) => Number(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })
const dateText = (value) => new Date(value).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })
const statusText = { pending: 'รอชำระเงิน', paid: 'ชำระเงินแล้ว', cancelled: 'ยกเลิกแล้ว' }
const statusClass = {
  pending: 'bg-yellow-50 text-yellow-700',
  paid: 'bg-green-50 text-green-700',
  cancelled: 'bg-gray-100 text-gray-600',
}

async function loadOrders() {
  // หน้านี้เป็น implementation เดิมของรายการ Order ปัจจุบัน route หลักใช้ Cart แทน
  loading.value = true
  error.value = ''
  try {
    const { data } = await http.get('/orders/mine', { params: { status: status.value } })
    orders.value = data
  } catch (e) {
    if (e.response?.status === 401) {
      auth.logout()
      return router.push('/login')
    }
    error.value = e.response?.data?.message || 'ไม่สามารถโหลดออร์เดอร์ได้'
  } finally {
    loading.value = false
  }
}

watch(status, loadOrders)
onMounted(loadOrders)
</script>

<template>
  <div class="min-h-screen bg-[#F6F9F4] text-[#17302A]">
    <AppNavbar />
    <main class="max-w-5xl mx-auto px-5 py-8">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="text-sm text-[#3E5A52]">ประวัติการสั่งซื้อ</p>
          <h1 class="text-3xl font-bold">ออร์เดอร์ของฉัน</h1>
        </div>
        <select v-model="status" class="border rounded-full px-4 py-2 bg-white">
          <option value="">ทุกสถานะ</option>
          <option value="pending">รอชำระเงิน</option>
          <option value="paid">ชำระเงินแล้ว</option>
          <option value="cancelled">ยกเลิกแล้ว</option>
        </select>
      </div>

      <p v-if="error" class="mt-6 bg-red-50 text-red-600 rounded p-3 text-sm">{{ error }}</p>
      <p v-else-if="loading" class="mt-10 text-gray-500">กำลังโหลดออร์เดอร์...</p>
      <p v-else-if="orders.length === 0" class="mt-10 text-gray-500">ยังไม่มีออร์เดอร์ในสถานะนี้</p>

      <div v-else class="mt-8 grid gap-4">
        <article v-for="order in orders" :key="order.order_id" class="bg-white rounded-2xl p-5 flex flex-wrap items-center gap-4">
          <div class="flex-1 min-w-[220px]">
            <div class="font-bold">ออร์เดอร์ #{{ order.order_id }}</div>
            <div class="mt-1 text-sm text-[#3E5A52]">{{ dateText(order.order_date) }} · {{ order.item_lines }} รายการ</div>
          </div>
          <span class="rounded-full px-3 py-1 text-xs" :class="statusClass[order.status]">{{ statusText[order.status] }}</span>
          <div class="font-bold">฿{{ baht(order.total_amount) }}</div>
          <RouterLink v-if="order.status === 'pending'" :to="`/orders/${order.order_id}/pay`"
            class="bg-[#14532D] text-white rounded-full px-5 py-2 text-sm">ชำระเงินต่อ</RouterLink>
          <RouterLink v-else :to="`/orders/${order.order_id}`" class="border border-[#14532D] text-[#14532D] rounded-full px-5 py-2 text-sm">ดูรายละเอียด</RouterLink>
        </article>
      </div>
    </main>
  </div>
</template>
