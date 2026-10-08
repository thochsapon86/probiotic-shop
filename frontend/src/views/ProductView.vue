<script setup>
import { ref, onMounted, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import Swal from 'sweetalert2'
import http from '../api/http'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()

const products = ref([])
const categories = ref([])
const search = ref('')
const category = ref('')
const loading = ref(true)
const error = ref('')

async function loadProducts() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await http.get('/products', {
      params: { search: search.value, category: category.value },
    })
    products.value = data
  } catch (e) {
    if (e.response?.status === 401) {
      auth.logout()
      router.push('/login')
      return
    }
    error.value = e.response?.data?.message || 'โหลดข้อมูลสินค้าไม่สำเร็จ'
  } finally {
    loading.value = false
  }
}

async function loadCategories() {
  try {
    const { data } = await http.get('/products/categories')
    categories.value = data
  } catch {
    categories.value = []
  }
}

let timer
watch(search, () => {
  clearTimeout(timer)
  timer = setTimeout(loadProducts, 400)
})
watch(category, loadProducts)

onMounted(() => {
  loadProducts()
  loadCategories()
})

// TODO: Feature 3 จะเปลี่ยนเป็นเพิ่มลงออร์เดอร์ตามรหัสสินค้า (p.id)
function selectProduct(p) {
  Swal.fire({
    icon: 'info',
    title: p.name,
    text: `รหัสสินค้า ${p.id} · ระบบสั่งซื้อจะเปิดใช้งานในขั้นถัดไป`,
    confirmButtonColor: '#14532D',
  })
}

function onLogout() {
  auth.logout()
  router.push('/login')
}

const baht = (n) => Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })
</script>

<template>
  <div class="min-h-screen bg-[#F6F9F4] text-[#17302A]">
    <header class="bg-white border-b">
      <div class="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
        <RouterLink to="/" class="text-lg font-bold text-[#14532D]">Probiotic Shop</RouterLink>
        <nav class="flex items-center gap-3 text-sm">
          <span class="hidden sm:inline text-[#3E5A52]">สวัสดี, {{ auth.user?.full_name || auth.user?.username }}</span>
          <RouterLink v-if="auth.isAdmin" to="/admin/products" class="hover:underline">จัดการสินค้า</RouterLink>
          <RouterLink to="/contact" class="hover:underline">ติดต่อเรา</RouterLink>
          <button @click="onLogout" class="border border-[#14532D] text-[#14532D] rounded-full px-4 py-1.5 hover:bg-[#F6F9F4]">
            ออกจากระบบ
          </button>
        </nav>
      </div>
    </header>

    <main class="max-w-6xl mx-auto px-5 py-8">
      <h1 class="text-3xl font-bold">สินค้าทั้งหมด</h1>

      <div class="mt-5 flex flex-wrap items-center gap-3">
        <input v-model="search" type="search" placeholder="ค้นหาสินค้า"
          class="w-full sm:w-72 border rounded-full px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-green-400" />
        <div v-if="categories.length" class="flex flex-wrap gap-2">
          <button @click="category = ''"
            :class="category === '' ? 'bg-[#14532D] text-white' : 'bg-white hover:bg-[#E3F0E6]'"
            class="rounded-full px-4 py-1.5 text-sm">ทั้งหมด</button>
          <button v-for="c in categories" :key="c" @click="category = c"
            :class="category === c ? 'bg-[#14532D] text-white' : 'bg-white hover:bg-[#E3F0E6]'"
            class="rounded-full px-4 py-1.5 text-sm">{{ c }}</button>
        </div>
      </div>

      <p v-if="error" class="mt-6 bg-red-50 text-red-600 rounded p-3 text-sm">{{ error }}</p>
      <p v-else-if="loading" class="mt-10 text-gray-500">กำลังโหลดสินค้า...</p>
      <p v-else-if="products.length === 0" class="mt-10 text-gray-500">
        {{ search || category ? 'ไม่พบสินค้าที่ตรงกับการค้นหา' : 'ยังไม่มีสินค้าในร้าน' }}
      </p>

      <div v-else class="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <article v-for="p in products" :key="p.id" class="bg-white rounded-3xl p-5 flex flex-col">
          <div class="h-44 rounded-2xl bg-[#E3F0E6] overflow-hidden flex items-center justify-center">
            <img v-if="p.image_url" :src="p.image_url" :alt="p.name" class="w-full h-full object-cover" loading="lazy" />
            <span v-else class="text-[#14532D]/60 text-sm">ไม่มีรูปสินค้า</span>
          </div>
          <p v-if="p.category" class="mt-4 text-xs text-[#3E5A52]">{{ p.category }}</p>
          <h2 class="mt-1 font-bold text-lg">{{ p.name }}</h2>
          <p class="mt-1 text-sm text-[#3E5A52] leading-relaxed flex-1 line-clamp-3">{{ p.description }}</p>
          <div class="mt-4 flex items-center justify-between">
            <div>
              <div class="text-xl font-bold">฿{{ baht(p.price) }}</div>
              <div class="text-xs" :class="p.stock > 0 ? 'text-[#3E5A52]' : 'text-red-600'">
                {{ p.stock > 0 ? `คงเหลือ ${p.stock} ชิ้น` : 'สินค้าหมด' }}
              </div>
            </div>
            <button @click="selectProduct(p)" :disabled="p.stock <= 0"
              class="bg-[#14532D] text-white rounded-full px-5 py-2 text-sm hover:bg-[#0f4023] disabled:bg-gray-300 disabled:cursor-not-allowed">
              เลือกสั่งซื้อ
            </button>
          </div>
        </article>
      </div>
    </main>
  </div>
</template>