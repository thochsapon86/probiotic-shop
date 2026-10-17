<script setup>
// หน้า Dashboard Admin: เรียกยอดขายและวาดกราฟด้วย Chart.js
import AppNavbar from '../components/AppNavBar.vue'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Bar } from 'vue-chartjs'
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from 'chart.js'
import http from '../api/http'
import { useAuthStore } from '../stores/auth'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const auth = useAuthStore()
const router = useRouter()
const loading = ref(true)
const error = ref('')
const from = ref('')
const to = ref('')
const summary = ref({ paid_orders: 0, total_sales: 0, average_order_value: 0 })
const dailySales = ref([])
const productSales = ref([])

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

const baht = (value) => Number(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })
const shortDate = (value) => new Date(`${value}T00:00:00`).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
const chartData = computed(() => ({
  labels: dailySales.value.map((item) => shortDate(item.date)),
  datasets: [{
    label: 'ยอดขาย (บาท)',
    data: dailySales.value.map((item) => item.total_sales),
    backgroundColor: '#14532D',
    borderRadius: 8,
    maxBarThickness: 48,
  }],
}))
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    title: { display: false },
    tooltip: { callbacks: { label: (context) => ` ฿${baht(context.raw)}` } },
  },
  scales: {
    x: { grid: { display: false } },
    y: {
      beginAtZero: true,
      ticks: { callback: (value) => `฿${Number(value).toLocaleString('th-TH')}` },
    },
  },
}
const productChartData = computed(() => ({
  labels: productSales.value.map((item) => item.product_name),
  datasets: [{
    label: 'ยอดขายสินค้า (บาท)',
    data: productSales.value.map((item) => item.total_sales),
    backgroundColor: '#3E7B5A',
    borderRadius: 8,
    maxBarThickness: 34,
  }],
}))
const productChartOptions = {
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    title: { display: false },
    tooltip: { callbacks: { label: (context) => ` ฿${baht(context.raw)}` } },
  },
  scales: {
    x: {
      beginAtZero: true,
      ticks: { callback: (value) => `฿${Number(value).toLocaleString('th-TH')}` },
    },
    y: { grid: { display: false } },
  },
}

async function loadDashboard() {
  error.value = ''
  loading.value = true
  try {
    const { data } = await http.get('/dashboard/sales', { params: { from: from.value, to: to.value } })
    summary.value = data.summary
    dailySales.value = data.daily_sales
    productSales.value = data.product_sales
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
          <div v-else class="mt-6 h-80">
            <Bar :data="chartData" :options="chartOptions" />
          </div>
        </section>

        <section class="mt-6 grid lg:grid-cols-2 gap-6">
          <div class="bg-white rounded-2xl p-5">
            <h2 class="font-bold text-lg">ยอดขายแยกตามสินค้า</h2>
            <p v-if="productSales.length === 0" class="mt-8 text-center text-gray-500">ยังไม่มีข้อมูลการขายสินค้า</p>
            <div v-else class="mt-6 h-80">
              <Bar :data="productChartData" :options="productChartOptions" />
            </div>
          </div>

          <div class="bg-white rounded-2xl p-5 overflow-hidden">
            <h2 class="font-bold text-lg">รายละเอียดสินค้า</h2>
            <p v-if="productSales.length === 0" class="mt-8 text-center text-gray-500">ยังไม่มีข้อมูลการขายสินค้า</p>
            <div v-else class="mt-4 overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="text-left text-[#3E5A52] border-b">
                  <tr>
                    <th class="py-2 pr-3">สินค้า</th>
                    <th class="py-2 px-3 text-right">ขายได้</th>
                    <th class="py-2 pl-3 text-right">ยอดขาย</th>
                  </tr>
                </thead>
                <tbody class="divide-y">
                  <tr v-for="item in productSales" :key="item.product_id">
                    <td class="py-3 pr-3">{{ item.product_name }}</td>
                    <td class="py-3 px-3 text-right">{{ item.sold_quantity.toLocaleString('th-TH') }}</td>
                    <td class="py-3 pl-3 text-right font-medium">฿{{ baht(item.total_sales) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </template>
    </main>
  </div>
</template>
