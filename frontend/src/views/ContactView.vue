<script setup>
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()

function onLogout() {
  auth.logout()
  router.push('/login')
}

// TODO: แก้เป็นข้อมูลจริงของกลุ่ม
const shop = {
  name: 'Probiotic Shop',
  address: '39 หมู่ 1 ถนนรังสิต-นครนายก ตำบลคลองหก อำเภอธัญบุรี จังหวัดปทุมธานี 12110',
  phone: '02-000-0000',
  email: 'contact@probioticshop.example',
  hours: 'จันทร์ - ศุกร์ 09:00 - 17:00 น.',
}

const members = [
  { name: 'ชื่อ-นามสกุล สมาชิกคนที่ 1', studentId: '66xxxxxxxx', role: 'Backend / Database', email: 'member1@example.com' },
  { name: 'ชื่อ-นามสกุล สมาชิกคนที่ 2', studentId: '66xxxxxxxx', role: 'Frontend / UI', email: 'member2@example.com' },
]
</script>

<template>
  <div class="min-h-screen bg-[#F6F9F4] text-[#17302A]">
    <header class="max-w-6xl mx-auto flex items-center justify-between px-5 py-4">
      <RouterLink to="/" class="text-xl font-bold text-[#14532D]">Probiotic Shop</RouterLink>
      <nav class="flex items-center gap-3 text-sm">
        <RouterLink to="/" class="hover:underline">หน้าแรก</RouterLink>
        <template v-if="auth.isLoggedIn">
          <button @click="onLogout" class="border border-[#14532D] text-[#14532D] rounded-full px-4 py-1.5 hover:bg-white">
            ออกจากระบบ
          </button>
        </template>
        <RouterLink v-else to="/login" class="px-5 py-2 hover:underline">
          เข้าสู่ระบบ
        </RouterLink>
        <RouterLink to="/contact" class="bg-[#14532D] text-white rounded-full px-3 py-2 hover:bg-[#0f4023]">ติดต่อเรา</RouterLink>
      </nav>
    </header>

    <main class="max-w-6xl mx-auto px-5 py-10">
      <h1 class="text-3xl md:text-4xl font-bold">ติดต่อเรา</h1>
      <p class="mt-3 text-[#3E5A52]">สอบถามข้อมูลสินค้าหรือการสั่งซื้อได้ตามช่องทางด้านล่าง</p>

      <section class="mt-8 grid md:grid-cols-2 gap-6">
        <div class="bg-white rounded-3xl p-6">
          <h2 class="font-bold text-lg">{{ shop.name }}</h2>
          <dl class="mt-4 space-y-3 text-sm">
            <div>
              <dt class="text-[#3E5A52]">ที่อยู่</dt>
              <dd>{{ shop.address }}</dd>
            </div>
            <div>
              <dt class="text-[#3E5A52]">โทรศัพท์</dt>
              <dd>{{ shop.phone }}</dd>
            </div>
            <div>
              <dt class="text-[#3E5A52]">อีเมล</dt>
              <dd>{{ shop.email }}</dd>
            </div>
            <div>
              <dt class="text-[#3E5A52]">เวลาทำการ</dt>
              <dd>{{ shop.hours }}</dd>
            </div>
          </dl>
        </div>

        <div class="bg-white rounded-3xl p-6">
          <h2 class="font-bold text-lg">ที่ตั้ง</h2>
          <!-- ฝังแผนที่: Google Maps → แชร์ → ฝังแผนที่ → คัดลอก src มาใส่ -->
          <iframe
            title="แผนที่ร้าน"
            class="mt-4 w-full h-56 rounded-2xl border-0"
            loading="lazy"
            src="https://www.google.com/maps?q=Rajamangala+University+of+Technology+Thanyaburi&output=embed"
          ></iframe>
        </div>
      </section>

      <section class="mt-12">
        <h2 class="text-2xl font-bold">ผู้จัดทำ</h2>
        <div class="mt-6 grid sm:grid-cols-2 gap-6">
          <article v-for="m in members" :key="m.studentId + m.name" class="bg-white rounded-3xl p-6 flex gap-4 items-start">
            <div class="w-14 h-14 shrink-0 rounded-full bg-[#14532D] text-white flex items-center justify-center font-bold text-xl">
              {{ m.name.charAt(0) }}
            </div>
            <div class="text-sm">
              <h3 class="font-bold text-base">{{ m.name }}</h3>
              <p class="text-[#3E5A52]">รหัสนักศึกษา {{ m.studentId }}</p>
              <p class="mt-1">หน้าที่: {{ m.role }}</p>
              <p class="text-[#3E5A52]">{{ m.email }}</p>
            </div>
          </article>
        </div>
      </section>
    </main>

    <footer class="max-w-6xl mx-auto px-5 py-8 text-sm text-[#3E5A52]">
      © 2026 Probiotic Shop · ผลิตภัณฑ์เสริมอาหาร ไม่ใช่ยา
    </footer>
  </div>
</template>