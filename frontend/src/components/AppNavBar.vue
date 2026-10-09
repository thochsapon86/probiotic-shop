<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useCartStore } from '../stores/cart'

const auth = useAuthStore()
const cart = useCartStore()
const route = useRoute()
const router = useRouter()

const menuOpen = ref(false) // เมนูมือถือ
const userOpen = ref(false) // เมนูผู้ใช้บนเดสก์ท็อป
const userMenuRef = ref(null)

const displayName = computed(() => auth.user?.full_name || auth.user?.username || '')
const initial = computed(() => displayName.value.charAt(0).toUpperCase())
const roleText = computed(() => (auth.isAdmin ? 'ผู้ดูแลระบบ' : 'สมาชิก'))
const showCart = computed(() => auth.isLoggedIn && !auth.isAdmin)
const cartBadge = computed(() => (cart.count > 99 ? '99+' : cart.count))

const links = computed(() => {
  const l = [{ to: '/', label: 'หน้าแรก' }]
  if (auth.isLoggedIn) l.push({ to: '/products', label: 'สินค้า' })
  if (auth.isAdmin) l.push({ to: '/admin/products', label: 'จัดการสินค้า' })
  l.push({ to: '/contact', label: 'ติดต่อเรา' })
  return l
})

const linkClass = (to) =>
  route.path === to
    ? 'bg-[#E3F0E6] text-[#14532D] font-semibold'
    : 'text-[#3E5A52] hover:bg-[#F6F9F4]'

function logout() {
  userOpen.value = false
  menuOpen.value = false
  auth.logout()
  router.push('/login')
}

// ปิดเมนูเมื่อเปลี่ยนหน้า / คลิกนอกเมนู / กด Esc
watch(() => route.fullPath, () => {
  menuOpen.value = false
  userOpen.value = false
})
function onDocClick(e) {
  if (userMenuRef.value && !userMenuRef.value.contains(e.target)) userOpen.value = false
}
function onKey(e) {
  if (e.key === 'Escape') {
    userOpen.value = false
    menuOpen.value = false
  }
}
onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <header class="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-[#E3F0E6]">
    <div class="max-w-6xl mx-auto px-5 h-16 flex items-center gap-4">
      <RouterLink to="/" class="text-lg font-bold text-[#14532D] shrink-0">Probiotic Shop</RouterLink>

      <!-- เมนูหลัก (เดสก์ท็อป) -->
      <nav class="hidden md:flex items-center gap-1 ml-4" aria-label="เมนูหลัก">
        <RouterLink v-for="l in links" :key="l.to" :to="l.to"
          class="px-4 py-2 rounded-full text-sm transition-colors" :class="linkClass(l.to)">
          {{ l.label }}
        </RouterLink>
      </nav>

      <div class="ml-auto flex items-center gap-1">
        <!-- ตะกร้า -->
        <RouterLink v-if="showCart" to="/cart"
          class="relative p-2 rounded-full text-[#14532D] hover:bg-[#F6F9F4]"
          :aria-label="`ตะกร้าสินค้า ${cart.count} ชิ้น`">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="8" cy="21" r="1" />
            <circle cx="19" cy="21" r="1" />
            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
          </svg>
          <span v-if="cart.count > 0"
            class="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full bg-[#F2D96B] text-[#17302A] text-xs font-bold flex items-center justify-center">
            {{ cartBadge }}
          </span>
        </RouterLink>

        <!-- เมนูผู้ใช้ (เดสก์ท็อป) -->
        <div v-if="auth.isLoggedIn" ref="userMenuRef" class="relative hidden md:block">
          <button type="button" @click="userOpen = !userOpen" :aria-expanded="userOpen" aria-haspopup="menu"
            class="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 hover:bg-[#F6F9F4]">
            <span class="w-8 h-8 rounded-full bg-[#14532D] text-white text-sm font-bold flex items-center justify-center">
              {{ initial }}
            </span>
            <span class="text-sm max-w-32 truncate">{{ displayName }}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <div v-if="userOpen" role="menu"
            class="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-lg border border-[#E3F0E6] p-2">
            <div class="px-3 py-2">
              <div class="text-sm font-medium truncate">{{ displayName }}</div>
              <div class="text-xs text-[#3E5A52]">{{ roleText }}</div>
            </div>
            <div class="my-1 border-t border-[#E3F0E6]"></div>
            <button type="button" role="menuitem" @click="logout"
              class="w-full text-left px-3 py-2 text-sm rounded-xl text-red-600 hover:bg-red-50">
              ออกจากระบบ
            </button>
          </div>
        </div>

        <!-- ปุ่มสำหรับผู้ที่ยังไม่ล็อกอิน (เดสก์ท็อป) -->
        <div v-else class="hidden md:flex items-center gap-2">
          <RouterLink to="/login" class="px-4 py-2 text-sm rounded-full hover:bg-[#F6F9F4]">เข้าสู่ระบบ</RouterLink>
          <RouterLink to="/register"
            class="px-5 py-2 text-sm rounded-full bg-[#14532D] text-white hover:bg-[#0f4023]">สมัครสมาชิก</RouterLink>
        </div>

        <!-- ปุ่มแฮมเบอร์เกอร์ (มือถือ) -->
        <button type="button" @click="menuOpen = !menuOpen" :aria-expanded="menuOpen" aria-label="เมนู"
          class="md:hidden p-2 rounded-full text-[#14532D] hover:bg-[#F6F9F4]">
          <svg v-if="!menuOpen" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- แผงเมนูมือถือ -->
    <div v-if="menuOpen" class="md:hidden border-t border-[#E3F0E6] bg-white">
      <nav class="max-w-6xl mx-auto px-5 py-3 flex flex-col gap-1" aria-label="เมนูมือถือ">
        <RouterLink v-for="l in links" :key="l.to" :to="l.to" class="px-4 py-3 rounded-xl text-sm"
          :class="linkClass(l.to)">
          {{ l.label }}
        </RouterLink>

        <template v-if="auth.isLoggedIn">
          <div class="mt-2 pt-3 border-t border-[#E3F0E6] flex items-center gap-3 px-4">
            <span class="w-9 h-9 rounded-full bg-[#14532D] text-white font-bold flex items-center justify-center">
              {{ initial }}
            </span>
            <div class="min-w-0">
              <div class="text-sm font-medium truncate">{{ displayName }}</div>
              <div class="text-xs text-[#3E5A52]">{{ roleText }}</div>
            </div>
          </div>
          <button type="button" @click="logout"
            class="mt-1 text-left px-4 py-3 rounded-xl text-sm text-red-600 hover:bg-red-50">
            ออกจากระบบ
          </button>
        </template>
        <template v-else>
          <RouterLink to="/login" class="mt-2 px-4 py-3 rounded-xl text-sm border border-[#14532D] text-[#14532D] text-center">
            เข้าสู่ระบบ
          </RouterLink>
          <RouterLink to="/register" class="px-4 py-3 rounded-xl text-sm bg-[#14532D] text-white text-center">
            สมัครสมาชิก
          </RouterLink>
        </template>
      </nav>
    </div>
  </header>
</template>