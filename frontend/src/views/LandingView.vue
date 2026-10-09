<script setup>
import AppNavbar from '../components/AppNavBar.vue'
import { imageSrc } from '../utils/imageUrl'
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import http from '../api/http'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()


// ---------- สินค้าแนะนำ (Carousel) ----------
const featured = ref([])
const loadingFeatured = ref(true)
const perView = ref(3) // จำนวนการ์ดต่อหน้า: มือถือ 1 / แท็บเล็ต 2 / เดสก์ท็อป 3
const page = ref(0)
const paused = ref(false)

const pageCount = computed(() => Math.max(1, Math.ceil(featured.value.length / perView.value)))
// ตำแหน่งการ์ดแรกที่แสดง (หน้าสุดท้ายไม่ให้เลื่อนเกินจนเหลือที่ว่าง)
const offset = computed(() =>
  Math.min(page.value * perView.value, Math.max(0, featured.value.length - perView.value))
)

function updatePerView() {
  const w = window.innerWidth
  perView.value = w >= 1024 ? 3 : w >= 640 ? 2 : 1
  if (page.value >= pageCount.value) page.value = 0
}
function goTo(i) {
  const n = pageCount.value
  page.value = ((i % n) + n) % n
}
const next = () => goTo(page.value + 1)
const prev = () => goTo(page.value - 1)

// เลื่อนอัตโนมัติทุก 4 วินาที หยุดเมื่อเอาเมาส์วาง/โฟกัส และไม่เลื่อนถ้าผู้ใช้ตั้งค่าลดการเคลื่อนไหว
let timer
function startAuto() {
  stopAuto()
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  timer = setInterval(() => {
    if (!paused.value && pageCount.value > 1) next()
  }, 4000)
}
function stopAuto() {
  clearInterval(timer)
}

// ปัดซ้าย-ขวาบนมือถือ
let touchX = 0
const onTouchStart = (e) => (touchX = e.touches[0].clientX)
function onTouchEnd(e) {
  const dx = e.changedTouches[0].clientX - touchX
  if (Math.abs(dx) > 50) dx < 0 ? next() : prev()
}

const baht = (n) => Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })

onMounted(async () => {
  updatePerView()
  window.addEventListener('resize', updatePerView)
  try {
    const { data } = await http.get('/products/featured')
    featured.value = data
  } catch {
    featured.value = []
  } finally {
    loadingFeatured.value = false
  }
  startAuto()
})
onBeforeUnmount(() => {
  stopAuto()
  window.removeEventListener('resize', updatePerView)
})

const steps = [
  { t: 'สมัครสมาชิก', d: 'ตั้ง Username และ Password เพื่อเข้าสู่ระบบ' },
  { t: 'เลือกสินค้า', d: 'ดูรายละเอียดและเลือกสินค้าที่ต้องการ' },
  { t: 'ชำระเงิน', d: 'กรอกข้อมูลการชำระเงินในหน้าเดียว' },
  { t: 'รับใบเสร็จ', d: 'ดาวน์โหลดใบเสร็จเป็น PDF ได้ทันที' },
]
</script>

<template>
  <div class="min-h-screen bg-[#F6F9F4] text-[#17302A]">
    <!-- Navbar -->
    <AppNavbar />

    <!-- Hero -->
    <section class="max-w-6xl mx-auto px-5 py-12 md:py-20 grid md:grid-cols-2 gap-10 items-center">
      <div>
        <h1 class="text-4xl md:text-5xl font-bold leading-tight">
          ลำไส้ที่สมดุล<br />เริ่มจากจุลินทรีย์ที่ดี
        </h1>
        <p class="mt-5 text-lg text-[#3E5A52] max-w-md leading-relaxed">
          โพรไบโอติกคุณภาพ ระบุจำนวน CFU และสายพันธุ์ชัดเจนทุกผลิตภัณฑ์ สั่งซื้อออนไลน์ได้ภายในไม่กี่คลิก
        </p>
        <div class="mt-8 flex flex-wrap gap-3">
          <RouterLink :to="auth.isLoggedIn ? '/products' : '/register'"
            class="bg-[#14532D] text-white rounded-full px-7 py-3 font-medium hover:bg-[#0f4023]">
            {{ auth.isLoggedIn ? 'เลือกซื้อสินค้า' : 'สมัครสมาชิกเพื่อสั่งซื้อ' }}
          </RouterLink>
          <a href="#products"
            class="border border-[#14532D] text-[#14532D] rounded-full px-7 py-3 font-medium hover:bg-white">
            ดูสินค้าแนะนำ
          </a>
        </div>
      </div>

      <!-- กลุ่มเซลล์จุลินทรีย์ (CSS ล้วน) -->
      <div class="relative h-72 md:h-96" aria-hidden="true">
        <div class="colony absolute w-56 h-56 md:w-72 md:h-72 rounded-full bg-[#CFE8D5] top-4 left-6"></div>
        <div class="colony absolute w-32 h-32 md:w-44 md:h-44 rounded-full bg-[#14532D] top-24 right-4"></div>
        <div class="colony absolute w-20 h-20 rounded-full bg-[#F4B8A8] bottom-4 left-24"></div>
        <div class="colony absolute w-12 h-12 rounded-full bg-[#F2D96B] top-2 right-24"></div>
        <div class="colony absolute w-8 h-8 rounded-full bg-[#9CC9D9] bottom-16 right-10"></div>
        <span class="absolute left-10 bottom-1 text-sm text-[#3E5A52]">Lactobacillus · Bifidobacterium</span>
      </div>
    </section>

    <!-- Benefits -->
    <section class="bg-white">
      <div class="max-w-6xl mx-auto px-5 py-14 grid md:grid-cols-3 gap-8">
        <div>
          <h2 class="font-bold text-lg">ระบุสายพันธุ์ชัดเจน</h2>
          <p class="mt-2 text-[#3E5A52] leading-relaxed">ทุกผลิตภัณฑ์แสดงชื่อสายพันธุ์และปริมาณจุลินทรีย์ที่มีชีวิต</p>
        </div>
        <div>
          <h2 class="font-bold text-lg">เก็บรักษาอย่างเหมาะสม</h2>
          <p class="mt-2 text-[#3E5A52] leading-relaxed">ตรวจสอบวันผลิตและวันหมดอายุทุกล็อตก่อนจัดส่ง</p>
        </div>
        <div>
          <h2 class="font-bold text-lg">ข้อมูลปลอดภัย</h2>
          <p class="mt-2 text-[#3E5A52] leading-relaxed">รหัสผ่านถูกเข้ารหัส และยืนยันตัวตนด้วยโทเคนทุกครั้งที่ใช้งาน</p>
        </div>
      </div>
    </section>

    <!-- Featured products (Carousel) -->
    <section id="products" class="max-w-6xl mx-auto px-5 py-16">
      <div class="flex items-end justify-between gap-4">
        <h2 class="text-2xl md:text-3xl font-bold">สินค้าแนะนำ</h2>
        <RouterLink :to="auth.isLoggedIn ? '/products' : '/login'" class="text-sm text-[#14532D] hover:underline">
          ดูสินค้าทั้งหมด
        </RouterLink>
      </div>

      <p v-if="loadingFeatured" class="mt-8 text-gray-500">กำลังโหลดสินค้า...</p>
      <p v-else-if="featured.length === 0" class="mt-8 text-gray-500">ยังไม่มีสินค้าแนะนำในขณะนี้</p>

      <div v-else class="mt-8" @mouseenter="paused = true" @mouseleave="paused = false"
        @focusin="paused = true" @focusout="paused = false">
        <div class="overflow-hidden -mx-3" @touchstart.passive="onTouchStart" @touchend="onTouchEnd">
          <div class="flex transition-transform duration-500 ease-out motion-reduce:transition-none"
            :style="{ transform: `translateX(-${offset * (100 / perView)}%)` }">
            <div v-for="p in featured" :key="p.product_id" class="shrink-0 px-3"
              :style="{ width: `${100 / perView}%` }">
              <article class="bg-white rounded-3xl p-6 flex flex-col h-full">
                <div class="h-40 rounded-2xl bg-[#E3F0E6] overflow-hidden flex items-center justify-center">
                  <img v-if="p.image_url" :src="imageSrc(p.image_url)" :alt="p.name" class="w-full h-full object-cover" loading="lazy" />
                  <span v-else class="text-sm text-[#14532D]/60">ไม่มีรูปสินค้า</span>
                </div>
                <p v-if="p.category" class="mt-4 text-xs text-[#3E5A52]">{{ p.category }}</p>
                <h3 class="mt-1 font-bold text-lg">{{ p.name }}</h3>
                <p class="mt-1 text-sm text-[#3E5A52] leading-relaxed flex-1 line-clamp-3">{{ p.description }}</p>
                <div class="mt-4 flex items-center justify-between">
                  <div>
                    <div class="text-xl font-bold">฿{{ baht(p.price) }}</div>
                    <div v-if="p.stock <= 5" class="text-xs text-amber-700">เหลือ {{ p.stock }} ชิ้น</div>
                  </div>
                  <RouterLink :to="auth.isLoggedIn ? '/products' : '/login'"
                    class="text-sm bg-[#14532D] text-white rounded-full px-4 py-2 hover:bg-[#0f4023]">
                    สั่งซื้อ
                  </RouterLink>
                </div>
              </article>
            </div>
          </div>
        </div>

        <!-- จุดบอกตำแหน่ง (pagination dots) -->
        <div v-if="pageCount > 1" class="mt-6 flex justify-center">
          <button v-for="i in pageCount" :key="i" type="button" @click="goTo(i - 1)"
            :aria-label="`ไปยังสินค้าชุดที่ ${i}`" :aria-current="page === i - 1 ? 'true' : undefined"
            class="p-1.5">
            <span class="block h-2.5 rounded-full transition-all duration-300"
              :class="page === i - 1 ? 'w-6 bg-[#14532D]' : 'w-2.5 bg-[#14532D]/30 hover:bg-[#14532D]/60'"></span>
          </button>
        </div>
      </div>
      <p v-if="!auth.isLoggedIn" class="mt-6 text-sm text-[#3E5A52]">
        ต้องเข้าสู่ระบบก่อนจึงจะสั่งซื้อได้
      </p>
    </section>

    <!-- Steps -->
    <section class="bg-[#14532D] text-white">
      <div class="max-w-6xl mx-auto px-5 py-16">
        <h2 class="text-2xl md:text-3xl font-bold">สั่งซื้อง่ายใน 4 ขั้นตอน</h2>
        <ol class="mt-8 grid sm:grid-cols-2 md:grid-cols-4 gap-6">
          <li v-for="(s, i) in steps" :key="s.t">
            <span class="inline-flex w-9 h-9 rounded-full bg-[#F2D96B] text-[#17302A] font-bold items-center justify-center">
              {{ i + 1 }}
            </span>
            <h3 class="mt-3 font-bold">{{ s.t }}</h3>
            <p class="mt-1 text-sm text-[#CFE8D5] leading-relaxed">{{ s.d }}</p>
          </li>
        </ol>
      </div>
    </section>

    <footer class="max-w-6xl mx-auto px-5 py-8 text-sm text-[#3E5A52]">
      © 2026 Probiotic Shop · ผลิตภัณฑ์เสริมอาหาร ไม่ใช่ยา
    </footer>
  </div>
</template>

<style scoped>
/* ลอยเบาๆ เฉพาะตอนโหลดหน้าแรก ปิดอัตโนมัติถ้าผู้ใช้ตั้งค่าลดการเคลื่อนไหว */
@keyframes drift {
  from { transform: translateY(8px) scale(0.97); }
  to { transform: translateY(0) scale(1); }
}
.colony { animation: drift 1.2s ease-out both; }
.colony:nth-child(2) { animation-delay: 0.15s; }
.colony:nth-child(3) { animation-delay: 0.3s; }
@media (prefers-reduced-motion: reduce) {
  .colony { animation: none; }
}
</style>