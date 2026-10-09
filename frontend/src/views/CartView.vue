<script setup>
import AppNavbar from '../components/AppNavbar.vue'
import { imageSrc } from '../utils/imageUrl'
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import http from '../api/http'
import { useAuthStore } from '../stores/auth'
import { useCartStore } from '../stores/cart'

const auth = useAuthStore()
const cart = useCartStore()
const router = useRouter()

const submitting = ref(false)
const error = ref('')

const baht = (n) => Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })

async function checkout() {
  error.value = ''
  submitting.value = true
  try {
    const items = cart.items.map((i) => ({ product_id: i.product_id, quantity: i.quantity }))
    const { data } = await http.post('/orders', { items })
    cart.clear()
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
    </main>
  </div>
</template>