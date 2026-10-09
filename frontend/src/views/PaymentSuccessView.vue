<script setup>
import AppNavbar from '../components/AppNavbar.vue'
import { ref, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import Swal from 'sweetalert2'
import http from '../api/http'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const payment = ref(null)
const loading = ref(true)
const error = ref('')

const methodText = { bank_transfer: 'โอนเงินผ่านธนาคาร', promptpay: 'พร้อมเพย์ (PromptPay)' }
const baht = (n) => Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })
const fmtDate = (d) => new Date(d).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })

onMounted(async () => {
  try {
    const { data } = await http.get(`/payments/order/${route.params.id}`)
    payment.value = data
  } catch (e) {
    if (e.response?.status === 401) {
      auth.logout()
      return router.push('/login')
    }
    // ยังไม่มีการชำระเงิน -> กลับไปหน้าสรุปรายการ
    if (e.response?.status === 404) return router.replace(`/orders/${route.params.id}`)
    error.value = e.response?.data?.message || 'โหลดข้อมูลไม่สำเร็จ'
  } finally {
    loading.value = false
  }
})

// TODO: Feature ถัดไปจะเปลี่ยนเป็นเปิดใบเสร็จ PDF
function openReceipt() {
  Swal.fire({
    icon: 'info',
    title: 'ใบเสร็จ',
    text: 'ใบเสร็จรูปแบบ PDF จะเปิดใช้งานในขั้นถัดไป',
    confirmButtonColor: '#14532D',
  })
}
</script>

<template>
  <div class="min-h-screen bg-[#F6F9F4] text-[#17302A]">
    <AppNavbar />

    <main class="max-w-xl mx-auto px-5 py-10">
      <p v-if="loading" class="text-gray-500">กำลังโหลด...</p>
      <p v-else-if="error" class="bg-red-50 text-red-600 rounded p-3 text-sm">{{ error }}</p>

      <div v-else-if="payment" class="bg-white rounded-3xl p-8 text-center">
        <div class="mx-auto w-16 h-16 rounded-full bg-[#14532D] text-white flex items-center justify-center text-3xl" aria-hidden="true">✓</div>
        <h1 class="mt-5 text-3xl font-bold">ชำระเงินเรียบร้อย</h1>
        <p class="mt-2 text-[#3E5A52]">ขอบคุณที่สั่งซื้อสินค้ากับเรา</p>

        <dl class="mt-6 text-sm text-left divide-y">
          <div class="py-2 flex justify-between"><dt class="text-[#3E5A52]">เลขที่ออร์เดอร์</dt><dd>#{{ payment.order_id }}</dd></div>
          <div class="py-2 flex justify-between"><dt class="text-[#3E5A52]">จำนวนเงิน</dt><dd class="font-bold">฿{{ baht(payment.amount) }}</dd></div>
          <div class="py-2 flex justify-between"><dt class="text-[#3E5A52]">วิธีชำระเงิน</dt><dd>{{ methodText[payment.payment_method] || payment.payment_method }}</dd></div>
          <div class="py-2 flex justify-between"><dt class="text-[#3E5A52]">เลขที่อ้างอิง</dt><dd>{{ payment.transaction_ref }}</dd></div>
          <div class="py-2 flex justify-between"><dt class="text-[#3E5A52]">วันเวลาที่ชำระ</dt><dd>{{ fmtDate(payment.payment_date) }}</dd></div>
        </dl>

        <div class="mt-8 flex flex-wrap justify-center gap-3">
          <button @click="openReceipt" class="bg-[#14532D] text-white rounded-full px-6 py-2.5 hover:bg-[#0f4023]">
            ดูใบเสร็จ
          </button>
          <RouterLink to="/products" class="border border-[#14532D] text-[#14532D] rounded-full px-6 py-2.5 hover:bg-[#F6F9F4]">
            เลือกซื้อสินค้าต่อ
          </RouterLink>
        </div>
      </div>
    </main>
  </div>
</template>