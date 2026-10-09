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

const order = ref(null)
const loading = ref(true)
const error = ref('')

const statusText = { pending: 'รอชำระเงิน', paid: 'ชำระเงินแล้ว', cancelled: 'ยกเลิก' }
const statusClass = {
  pending: 'bg-amber-100 text-amber-800',
  paid: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-200 text-gray-600',
}

const baht = (n) => Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })
const fmtDate = (d) =>
  new Date(d).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })

onMounted(async () => {
  try {
    const { data } = await http.get(`/orders/${route.params.id}`)
    order.value = data
  } catch (e) {
    if (e.response?.status === 401) {
      auth.logout()
      router.push('/login')
      return
    }
    error.value = e.response?.data?.message || 'โหลดข้อมูลออร์เดอร์ไม่สำเร็จ'
  } finally {
    loading.value = false
  }
})

function goPay() {
  router.push(`/orders/${order.value.order_id}/pay`)
}

async function cancelOrder() {
  const r = await Swal.fire({
    icon: 'warning',
    title: 'ยกเลิกออร์เดอร์นี้?',
    text: 'สินค้าจะถูกคืนเข้าสต็อก',
    showCancelButton: true,
    confirmButtonText: 'ยกเลิกออร์เดอร์',
    cancelButtonText: 'ไม่ยกเลิก',
    confirmButtonColor: '#dc2626',
  })
  if (!r.isConfirmed) return
  try {
    await http.post(`/orders/${order.value.order_id}/cancel`)
    order.value.status = 'cancelled'
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'ยกเลิกไม่สำเร็จ', text: e.response?.data?.message || '' })
  }
}
</script>

<template>
  <div class="min-h-screen bg-[#F6F9F4] text-[#17302A]">
    <AppNavbar />

    <main class="max-w-3xl mx-auto px-5 py-8">
      <p v-if="loading" class="text-gray-500">กำลังโหลด...</p>
      <p v-else-if="error" class="bg-red-50 text-red-600 rounded p-3 text-sm">{{ error }}</p>

      <template v-else-if="order">
        <h1 class="text-3xl font-bold">สั่งซื้อสินค้าเรียบร้อย</h1>
        <p class="mt-2 text-[#3E5A52]">กรุณาตรวจสอบรายการด้านล่าง แล้วดำเนินการชำระเงินต่อ</p>

        <div class="mt-6 bg-white rounded-3xl p-6">
          <div class="flex flex-wrap justify-between gap-3">
            <div>
              <div class="text-sm text-[#3E5A52]">เลขที่ออร์เดอร์</div>
              <div class="text-xl font-bold">#{{ order.order_id }}</div>
            </div>
            <span class="self-start rounded-full px-3 py-1 text-sm" :class="statusClass[order.status]">
              {{ statusText[order.status] }}
            </span>
          </div>
          <dl class="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
            <div><dt class="text-[#3E5A52]">ผู้สั่งซื้อ</dt><dd>{{ order.full_name || order.username }}</dd></div>
            <div><dt class="text-[#3E5A52]">วันที่สั่งซื้อ</dt><dd>{{ fmtDate(order.order_date) }}</dd></div>
            <div v-if="order.address" class="sm:col-span-2">
              <dt class="text-[#3E5A52]">ที่อยู่จัดส่ง</dt><dd>{{ order.address }}</dd>
            </div>
          </dl>
        </div>

        <div class="mt-4 bg-white rounded-3xl overflow-x-auto">
          <table class="w-full text-sm min-w-[480px]">
            <thead class="text-left bg-[#E3F0E6]">
              <tr>
                <th class="px-4 py-3">รหัส</th>
                <th class="px-4 py-3">สินค้า</th>
                <th class="px-4 py-3 text-right">ราคา/ชิ้น</th>
                <th class="px-4 py-3 text-right">จำนวน</th>
                <th class="px-4 py-3 text-right">รวม</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="i in order.items" :key="i.order_detail_id" class="border-t">
                <td class="px-4 py-3">{{ i.product_id }}</td>
                <td class="px-4 py-3">{{ i.name }}</td>
                <td class="px-4 py-3 text-right">{{ baht(i.price_at_order) }}</td>
                <td class="px-4 py-3 text-right">{{ i.quantity }}</td>
                <td class="px-4 py-3 text-right">{{ baht(i.subtotal) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="border-t">
                <td colspan="4" class="px-4 py-3 text-right font-bold">ยอดที่ต้องชำระ</td>
                <td class="px-4 py-3 text-right font-bold">฿{{ baht(order.total_amount) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div class="mt-6 flex flex-wrap justify-end gap-3">
          <template v-if="order.status === 'pending'">
            <button @click="cancelOrder"
              class="border border-red-300 text-red-600 rounded-full px-6 py-3 hover:bg-red-50">
              ยกเลิกออร์เดอร์
            </button>
            <button @click="goPay"
              class="bg-[#14532D] text-white rounded-full px-8 py-3 font-medium hover:bg-[#0f4023]">
              ชำระเงิน
            </button>
          </template>
          <RouterLink v-else-if="order.status === 'paid'" :to="`/orders/${order.order_id}/success`"
            class="bg-[#14532D] text-white rounded-full px-8 py-3 font-medium hover:bg-[#0f4023]">
            ดูหลักฐานการชำระเงิน
          </RouterLink>
        </div>
      </template>
    </main>
  </div>
</template>