<script setup>
import AppNavbar from '../components/AppNavbar.vue'
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import http from '../api/http'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const order = ref(null)
const loading = ref(true)
const error = ref('')
const formError = ref('')
const submitting = ref(false)

const method = ref('bank_transfer')
const reference = ref('')
const confirmed = ref(false)

// TODO: แก้เป็นบัญชีรับเงินจริงของร้าน
const methods = {
  bank_transfer: {
    label: 'โอนเงินผ่านธนาคาร',
    lines: ['ธนาคาร: กสิกรไทย', 'เลขที่บัญชี: 000-0-00000-0', 'ชื่อบัญชี: บริษัท โปรไบโอติก ช็อป จำกัด'],
  },
  promptpay: {
    label: 'พร้อมเพย์ (PromptPay)',
    lines: ['พร้อมเพย์: 000-000-0000', 'ชื่อบัญชี: บริษัท โปรไบโอติก ช็อป จำกัด'],
  },
}

const baht = (n) => Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })

onMounted(async () => {
  try {
    const { data } = await http.get(`/orders/${route.params.id}`)
    if (data.status === 'paid') return router.replace(`/orders/${data.order_id}/success`)
    if (data.status !== 'pending') return router.replace(`/orders/${data.order_id}`)
    order.value = data
  } catch (e) {
    if (e.response?.status === 401) {
      auth.logout()
      return router.push('/login')
    }
    error.value = e.response?.data?.message || 'โหลดข้อมูลออร์เดอร์ไม่สำเร็จ'
  } finally {
    loading.value = false
  }
})

async function submit() {
  formError.value = ''
  const ref_ = reference.value.trim()
  if (!/^[A-Za-z0-9-]{6,30}$/.test(ref_)) {
    formError.value = 'เลขที่อ้างอิงต้องเป็น a-z, 0-9, - ความยาว 6-30 ตัว'
    return
  }
  if (!confirmed.value) {
    formError.value = 'กรุณายืนยันว่าได้โอนเงินตามยอดที่ระบุแล้ว'
    return
  }
  submitting.value = true
  try {
    await http.post('/payments', {
      order_id: order.value.order_id,
      payment_method: method.value,
      transaction_ref: ref_,
    })
    router.push(`/orders/${order.value.order_id}/success`)
  } catch (e) {
    formError.value = e.response?.data?.message || 'บันทึกการชำระเงินไม่สำเร็จ'
  } finally {
    submitting.value = false
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
        <h1 class="text-3xl font-bold">ชำระเงิน</h1>

        <section class="mt-6 bg-white rounded-3xl p-6">
          <h2 class="font-bold">สรุปรายการ</h2>
          <dl class="mt-3 grid sm:grid-cols-2 gap-3 text-sm">
            <div><dt class="text-[#3E5A52]">ผู้ซื้อ</dt><dd>{{ order.full_name || order.username }}</dd></div>
            <div><dt class="text-[#3E5A52]">เลขที่ออร์เดอร์</dt><dd>#{{ order.order_id }}</dd></div>
            <div v-if="order.phone"><dt class="text-[#3E5A52]">เบอร์โทร</dt><dd>{{ order.phone }}</dd></div>
            <div v-if="order.address" class="sm:col-span-2"><dt class="text-[#3E5A52]">ที่อยู่จัดส่ง</dt><dd>{{ order.address }}</dd></div>
          </dl>
          <ul class="mt-4 text-sm divide-y">
            <li v-for="i in order.items" :key="i.order_detail_id" class="py-2 flex justify-between gap-3">
              <span>{{ i.name }} × {{ i.quantity }}</span>
              <span>฿{{ baht(i.subtotal) }}</span>
            </li>
          </ul>
          <div class="mt-4 pt-4 border-t flex justify-between items-baseline">
            <span class="font-bold">จำนวนเงินที่ต้องชำระ</span>
            <span class="text-2xl font-bold text-[#14532D]">฿{{ baht(order.total_amount) }}</span>
          </div>
        </section>

        <form @submit.prevent="submit" class="mt-4 bg-white rounded-3xl p-6 space-y-4">
          <h2 class="font-bold">ข้อมูลการชำระเงิน</h2>
          <div v-if="formError" class="bg-red-50 text-red-600 text-sm rounded p-2">{{ formError }}</div>

          <fieldset>
            <legend class="text-sm mb-2">วิธีชำระเงิน</legend>
            <div class="grid sm:grid-cols-2 gap-3">
              <label v-for="(m, key) in methods" :key="key"
                class="border rounded-xl p-3 cursor-pointer flex items-center gap-2"
                :class="method === key ? 'border-[#14532D] bg-[#F6F9F4]' : ''">
                <input type="radio" v-model="method" :value="key" class="accent-[#14532D]" />
                <span class="text-sm">{{ m.label }}</span>
              </label>
            </div>
          </fieldset>

          <div class="bg-[#F6F9F4] rounded-xl p-4 text-sm space-y-1">
            <p class="font-medium">โอนเงินมาที่</p>
            <p v-for="l in methods[method].lines" :key="l">{{ l }}</p>
            <p class="pt-1 text-[#3E5A52]">ยอดโอน ฿{{ baht(order.total_amount) }}</p>
          </div>

          <div>
            <label class="block text-sm mb-1">เลขที่อ้างอิงการโอน (จากสลิป) *</label>
            <input v-model="reference" maxlength="30" placeholder="เช่น 202610090012345"
              class="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>

          <label class="flex items-start gap-2 text-sm">
            <input type="checkbox" v-model="confirmed" class="mt-1 accent-[#14532D]" />
            <span>ข้าพเจ้าได้โอนเงินตามยอดที่ระบุข้างต้นเรียบร้อยแล้ว</span>
          </label>

          <button :disabled="submitting"
            class="w-full bg-[#14532D] text-white rounded-full py-3 font-medium hover:bg-[#0f4023] disabled:opacity-60">
            {{ submitting ? 'กำลังบันทึก...' : `ยืนยันการชำระเงิน ฿${baht(order.total_amount)}` }}
          </button>
        </form>
      </template>
    </main>
  </div>
</template>