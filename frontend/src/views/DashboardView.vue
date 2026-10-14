<script setup>
import AppNavbar from '../components/AppNavBar.vue'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import http from '../api/http'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const loading = ref(true)
const error = ref('')
const from = ref('')
const to = ref('')
const summary = ref({ paid_orders: 0, total_sales: 0, average_order_value: 0 })
const dailySales = ref([])

function toDateInput(date) {
  return date.toISOString().slice(0, 10)
}

function setDefaultRange() {
  const today = new Date()
  const start = new Date(today)
  start.setDate(today.getDate() - 6)
  from.value = toDateInput(start)
  to.value = toDateInput(today)
}

const maxSales = computed(() => Math.max(...dailySales.value.map((item) => item.total_sales), 1))
const baht = (value) => Number(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })
const shortDate = (value) => new Date(`${value}T00:00:00`).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })

async function loadDashboard() {
  error.value = ''
  loading.value = true
  try {
    const { data } = await http.get('/dashboard/sales', { params: { from: from.value, to: to.value } })
    summary.value = data.summary
    dailySales.value = data.daily_sales
  } catch (e) {
    if (e.response?.status === 401) {
      auth.logout()
      return router.push('/login')
    }
    if (e.response?.status === 403) return router.push('/')
    error.value = e.response?.data?.message || 'ไม่สามารถโหลดข้อมูล Dashboard ได้'
  } finally {
    loading.value = false
  }
}

function search() {
  if (!from.value || !to.value || from.value > to.value) {
    error.value = 'กรุณาเลือกช่วงวันที่ให้ถูกต้อง'
    return
  }
  loadDashboard()
}

onMounted(() => {
  setDefaultRange()
  loadDashboard()
})
</script>

<template>
  <div class="min-h-screen bg-[#F6F9F4] text-[#17302A]">
    <AppNavbar />

    <main class="max-w-6xl mx-auto px-5 py-8">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="text-sm text-[#3E5A52]">สำหรับผู้ดูแลระบบ</p>
          <h1 class="text-3xl font-bold">Dashboard ยอดขาย</h1>
        </div>
        <form class="flex flex-wrap items-end gap-2" @submit.prevent="search">
          <label class="text-sm">ตั้งแต่<input v-model="from" type="date" class="block mt-1 border rounded-lg px-3 py-2 bg-white" /></label>
          <label class="text-sm">ถึง<input v-model="to" type="date" class="block mt-1 border rounded-lg px-3 py-2 bg-white" /></label>
          <button class="bg-[#14532D] text-white rounded-full px-5 py-2.5">ดูรายงาน</button>
        </form>
      </div>

      <p v-if="error" class="mt-6 bg-red-50 text-red-600 rounded p-3 text-sm">{{ error }}</p>
      <p v-else-if="loading" class="mt-10 text-gray-500">กำลังโหลดข้อมูล...</p>

      <template v-else>
        <section class="mt-8 grid sm:grid-cols-3 gap-4">
          <article class="bg-white rounded-2xl p-5">
            <p class="text-sm text-[#3E5A52]">ยอดขายรวม</p>
            <p class="mt-2 text-2xl font-bold text-[#14532D]">฿{{ baht(summary.total_sales) }}</p>
          </article>
          <article class="bg-white rounded-2xl p-5">
            <p class="text-sm text-[#3E5A52]">ออร์เดอร์ที่ชำระแล้ว</p>
            <p class="mt-2 text-2xl font-bold">{{ summary.paid_orders.toLocaleString('th-TH') }} รายการ</p>
          </article>
          <article class="bg-white rounded-2xl p-5">
            <p class="text-sm text-[#3E5A52]">ยอดเฉลี่ยต่อออร์เดอร์</p>
            <p class="mt-2 text-2xl font-bold">฿{{ baht(summary.average_order_value) }}</p>
          </article>
        </section>

        <section class="mt-6 bg-white rounded-2xl p-5">
          <div class="flex items-center justify-between gap-3">
            <h2 class="font-bold text-lg">ยอดขายรายวัน</h2>
            <span class="text-sm text-[#3E5A52]">{{ from }} ถึง {{ to }}</span>
          </div>
          <p v-if="dailySales.length === 0" class="mt-8 text-center text-gray-500">ยังไม่มีข้อมูลยอดขายในช่วงเวลานี้</p>
          <div v-else class="mt-6 space-y-4">
            <div v-for="item in dailySales" :key="item.date" class="grid grid-cols-[4rem_1fr_6rem] items-center gap-3 text-sm">
              <span>{{ shortDate(item.date) }}</span>
              <div class="h-7 bg-[#E3F0E6] rounded-full overflow-hidden" :title="`฿${baht(item.total_sales)}`">
                <div class="h-full bg-[#14532D] rounded-full" :style="{ width: `${(item.total_sales / maxSales) * 100}%` }"></div>
              </div>
              <span class="text-right font-medium">฿{{ baht(item.total_sales) }}</span>
            </div>
          </div>
        </section>
      </template>
    </main>
  </div>
</template>
