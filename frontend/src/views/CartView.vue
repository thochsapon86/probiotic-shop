<script setup>
// หน้าตะกร้า: แก้จำนวนสินค้า สร้างออเดอร์ และดูออเดอร์แยกตามสถานะ
import AppNavbar from '../components/AppNavbar.vue'
import { imageSrc } from '../utils/imageUrl'
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import http from '../api/http'
import { useAuthStore } from '../stores/auth'
import { useCartStore } from '../stores/cart'

const auth = useAuthStore()
const cart = useCartStore()
const router = useRouter()

const submitting = ref(false)
const error = ref('')
const orders = ref([])
const ordersLoading = ref(true)
const ordersError = ref('')
const orderStatus = ref('all')

const baht = (n) => Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })
const statusText = {
  all: 'ทั้งหมด',
  pending: 'รอชำระเงิน',
  paid: 'ชำระเงินแล้ว',
  cancelled: 'ยกเลิกแล้ว',
}
const statusClass = {
  pending: 'bg-yellow-50 text-yellow-700',
  paid: 'bg-green-50 text-green-700',
  cancelled: 'bg-gray-100 text-gray-600',
}
const filteredOrders = computed(() => orderStatus.value === 'all'
  ? orders.value
  : orders.value.filter((order) => order.status === orderStatus.value))

const orderCount = (status) => status === 'all'
  ? orders.value.length
  : orders.value.filter((order) => order.status === status).length

const dateText = (value) => new Date(value).toLocaleString('th-TH', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

async function loadOrders() {
  ordersLoading.value = true
  ordersError.value = ''
  try {
    const { data } = await http.get('/orders/mine')
    orders.value = data
  } catch (e) {
    if (e.response?.status === 401) {
      auth.logout()
      router.push('/login')
      return
    }
    ordersError.value = e.response?.data?.message || 'ไม่สามารถโหลดรายการออเดอร์ได้'
  } finally {
    ordersLoading.value = false
  }
}

async function checkout() {
  error.value = ''
  submitting.value = true
  try {
    const items = cart.items.map((i) => ({ product_id: i.product_id, quantity: i.quantity }))
    const { data } = await http.post('/orders', { items })
    cart.clear()
    auth.setPendingOrder(data.order_id)
    router.push(`/orders/${data.order_id}`)
  } catch (e) {
    if (e.response?.status === 401) {
      auth.logout()
      router.push('/login')
      return
    }
    error.value = e.response?.data?.message || 'สั่งซื้อไม่สำเร็จ'
  } finally {
    submitting.value = false
  }
}

onMounted(loadOrders)

</script>

<template>
  <div class="min-h-screen bg-[#F6F9F4] text-[#17302A]">
    <AppNavbar />

    <main class="max-w-4xl mx-auto px-5 py-8">
      <h1 class="text-3xl font-bold">ตะกร้าสินค้า</h1>

      <div v-if="cart.items.length === 0" class="mt-8 bg-white rounded-3xl p-8 text-center">
        <p class="text-[#3E5A52]">ยังไม่มีสินค้าในตะกร้า</p>
        <RouterLink to="/products" class="inline-block mt-4 bg-[#14532D] text-white rounded-full px-6 py-2 hover:bg-[#0f4023]">
          ไปเลือกสินค้า
        </RouterLink>
      </div>

      <template v-else>
        <div class="mt-6 bg-white rounded-3xl divide-y">
          <div v-for="i in cart.items" :key="i.product_id" class="p-4 flex flex-wrap items-center gap-4">
            <div class="w-16 h-16 rounded-xl bg-[#E3F0E6] overflow-hidden shrink-0">
              <img v-if="i.image_url" :src="imageSrc(i.image_url)" :alt="i.name" class="w-full h-full object-cover" />
            </div>
            <div class="flex-1 min-w-[160px]">
              <div class="font-medium">{{ i.name }}</div>
              <div class="text-xs text-[#3E5A52]">รหัสสินค้า #{{ i.product_id }} · ฿{{ baht(i.price) }} / ชิ้น</div>
            </div>
            <div class="flex items-center gap-2">
              <button @click="cart.setQty(i.product_id, i.quantity - 1)" :disabled="i.quantity <= 1"
                class="w-8 h-8 rounded-full border disabled:opacity-40" aria-label="ลดจำนวน">−</button>
              <input :value="i.quantity" @change="cart.setQty(i.product_id, $event.target.value)"
                type="number" min="1" :max="i.stock" class="w-14 text-center border rounded-lg py-1" />
              <button @click="cart.setQty(i.product_id, i.quantity + 1)" :disabled="i.quantity >= i.stock"
                class="w-8 h-8 rounded-full border disabled:opacity-40" aria-label="เพิ่มจำนวน">+</button>
            </div>
            <div class="w-28 text-right font-medium">฿{{ baht(i.price * i.quantity) }}</div>
            <button @click="cart.remove(i.product_id)" class="text-red-600 text-sm hover:underline">ลบ</button>
          </div>
        </div>

        <p v-if="error" class="mt-4 bg-red-50 text-red-600 text-sm rounded p-3">{{ error }}</p>

        <div class="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div class="text-xl">ยอดรวม <span class="font-bold">฿{{ baht(cart.total) }}</span></div>
          <button @click="checkout" :disabled="submitting"
            class="bg-[#14532D] text-white rounded-full px-8 py-3 font-medium hover:bg-[#0f4023] disabled:opacity-60">
            {{ submitting ? 'กำลังสร้างออร์เดอร์...' : 'ยืนยันการสั่งซื้อ' }}
          </button>
        </div>
      </template>

      <!-- รายการออเดอร์อยู่ในหน้าตะกร้าเดียวกัน โดยแบ่งสถานะแบบร้านค้าออนไลน์ -->
      <section class="mt-10">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p class="text-sm text-[#3E5A52]">ประวัติการสั่งซื้อ</p>
            <h2 class="text-2xl font-bold">ออเดอร์ของฉัน</h2>
          </div>
          <span class="text-sm text-[#3E5A52]">{{ orders.length }} ออเดอร์</span>
        </div>

        <div class="mt-4 overflow-x-auto bg-white rounded-2xl border border-[#E3F0E6]">
          <div class="min-w-max flex items-center">
            <button v-for="status in ['all', 'pending', 'paid', 'cancelled']" :key="status"
              type="button" @click="orderStatus = status"
              class="px-5 py-4 text-sm border-b-2 transition-colors"
              :class="orderStatus === status
                ? 'border-[#14532D] text-[#14532D] font-semibold'
                : 'border-transparent text-[#3E5A52] hover:text-[#14532D]'">
              {{ statusText[status] }}
              <span class="ml-1 text-xs">({{ orderCount(status) }})</span>
            </button>
          </div>
        </div>

        <p v-if="ordersError" class="mt-4 bg-red-50 text-red-600 rounded p-3 text-sm">{{ ordersError }}</p>
        <p v-else-if="ordersLoading" class="mt-6 text-gray-500">กำลังโหลดรายการออเดอร์...</p>
        <p v-else-if="filteredOrders.length === 0" class="mt-6 bg-white rounded-2xl p-8 text-center text-gray-500">
          ยังไม่มีออเดอร์ในสถานะนี้
        </p>

        <div v-else class="mt-4 grid gap-3">
          <article v-for="order in filteredOrders" :key="order.order_id"
            class="bg-white rounded-2xl p-4 flex flex-wrap items-center gap-4 border border-[#E3F0E6]">
            <div class="flex-1 min-w-[220px]">
              <div class="font-bold">ออเดอร์ #{{ order.order_id }}</div>
              <div class="mt-1 text-sm text-[#3E5A52]">
                {{ dateText(order.order_date) }} · {{ order.item_lines }} รายการ
              </div>
            </div>
            <span class="rounded-full px-3 py-1 text-xs" :class="statusClass[order.status]">
              {{ statusText[order.status] }}
            </span>
            <div class="font-bold">฿{{ baht(order.total_amount) }}</div>
            <RouterLink v-if="order.status === 'pending'" :to="`/orders/${order.order_id}/pay`"
              class="bg-[#14532D] text-white rounded-full px-5 py-2 text-sm">
              ชำระเงินต่อ
            </RouterLink>
            <RouterLink v-else :to="`/orders/${order.order_id}`"
              class="border border-[#14532D] text-[#14532D] rounded-full px-5 py-2 text-sm">
              ดูรายละเอียด
            </RouterLink>
          </article>
        </div>
      </section>
    </main>
  </div>
</template>
