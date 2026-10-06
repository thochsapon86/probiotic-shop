<script setup>
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()

function onLogout() {
  auth.logout()
  router.push('/login')
}

// ตัวอย่างข้อมูล (ภายหลังเปลี่ยนเป็นดึงจาก API /products)
const featured = [
  { name: 'Daily Gut Balance', desc: 'โพรไบโอติก 10 สายพันธุ์ สำหรับดูแลลำไส้ทุกวัน', price: 590, cfu: '20 พันล้าน CFU' },
  { name: 'Kids Probio Powder', desc: 'ชนิดผง ละลายน้ำง่าย รสนมอ่อนๆ เหมาะกับเด็ก', price: 450, cfu: '5 พันล้าน CFU' },
  { name: 'Immune Plus', desc: 'โพรไบโอติกผสมวิตามินซี และสังกะสี', price: 690, cfu: '30 พันล้าน CFU' },
]

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
    <header class="max-w-6xl mx-auto flex items-center justify-between px-5 py-4">
      <RouterLink to="/" class="text-xl font-bold text-[#14532D]">Probiotic Shop</RouterLink>
      <nav class="flex items-center gap-3 text-sm">
        <template v-if="auth.isLoggedIn">
          <span class="hidden sm:inline text-[#3E5A52]">สวัสดี, {{ auth.user?.full_name || auth.user?.username }}</span>
          <RouterLink :to="auth.isAdmin ? '/admin/products' : '/products'"
            class="bg-[#14532D] text-white rounded-full px-5 py-2 hover:bg-[#0f4023]">
            {{ auth.isAdmin ? 'จัดการสินค้า' : 'ดูสินค้า' }}
          </RouterLink>
          <button type="button" @click="onLogout"
            class="border border-[#14532D] text-[#14532D] rounded-full px-5 py-2 hover:bg-white">
            ออกจากระบบ
          </button>
        </template>
        <template v-else>
          <RouterLink to="/login" class="px-3 py-2 hover:underline">เข้าสู่ระบบ</RouterLink>
          <RouterLink to="/register"
            class="bg-[#14532D] text-white rounded-full px-5 py-2 hover:bg-[#0f4023]">สมัครสมาชิก</RouterLink>
        </template>
      </nav>
    </header>

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

    <!-- Featured products -->
    <section id="products" class="max-w-6xl mx-auto px-5 py-16">
      <h2 class="text-2xl md:text-3xl font-bold">สินค้าแนะนำ</h2>
      <div class="mt-8 grid md:grid-cols-3 gap-6">
        <article v-for="p in featured" :key="p.name" class="bg-white rounded-3xl p-6 flex flex-col">
          <div class="h-36 rounded-2xl bg-[#E3F0E6] flex items-end p-4">
            <span class="text-sm font-medium text-[#14532D]">{{ p.cfu }}</span>
          </div>
          <h3 class="mt-4 font-bold text-lg">{{ p.name }}</h3>
          <p class="mt-1 text-sm text-[#3E5A52] leading-relaxed flex-1">{{ p.desc }}</p>
          <div class="mt-4 flex items-center justify-between">
            <span class="text-xl font-bold">฿{{ p.price.toLocaleString() }}</span>
            <RouterLink :to="auth.isLoggedIn ? '/products' : '/login'"
              class="text-sm bg-[#14532D] text-white rounded-full px-4 py-2 hover:bg-[#0f4023]">
              สั่งซื้อ
            </RouterLink>
          </div>
        </article>
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