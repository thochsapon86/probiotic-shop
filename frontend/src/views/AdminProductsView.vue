<script setup>
import { ref, onMounted, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import Swal from 'sweetalert2'
import http from '../api/http'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()

const products = ref([])
const search = ref('')
const loading = ref(false)

const showModal = ref(false)
const editingId = ref(null)
const saving = ref(false)
const formError = ref('')
const emptyForm = () => ({ name: '', description: '', price: '', stock: '', image_url: '' })
const form = ref(emptyForm())

async function loadProducts() {
  loading.value = true
  try {
    const { data } = await http.get('/products', { params: { search: search.value } })
    products.value = data
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'โหลดข้อมูลไม่สำเร็จ', text: e.response?.data?.message || '' })
  } finally {
    loading.value = false
  }
}

// ค้นหาอัตโนมัติหลังหยุดพิมพ์ 400 ms
let timer
watch(search, () => {
  clearTimeout(timer)
  timer = setTimeout(loadProducts, 400)
})

onMounted(loadProducts)

function openAdd() {
  editingId.value = null
  form.value = emptyForm()
  formError.value = ''
  showModal.value = true
}

function openEdit(p) {
  editingId.value = p.id
  form.value = {
    name: p.name,
    description: p.description || '',
    price: p.price,
    stock: p.stock,
    image_url: p.image_url || '',
  }
  formError.value = ''
  showModal.value = true
}

async function save() {
  formError.value = ''
  const f = form.value
  if (!f.name.trim()) return (formError.value = 'กรุณากรอกชื่อสินค้า')
  if (f.price === '' || Number(f.price) < 0) return (formError.value = 'ราคาต้องไม่ต่ำกว่า 0')
  if (f.stock === '' || !Number.isInteger(Number(f.stock)) || Number(f.stock) < 0)
    return (formError.value = 'สต็อกต้องเป็นจำนวนเต็มไม่ต่ำกว่า 0')

  saving.value = true
  try {
    if (editingId.value) await http.put(`/products/${editingId.value}`, f)
    else await http.post('/products', f)
    showModal.value = false
    await loadProducts()
    Swal.fire({ icon: 'success', title: editingId.value ? 'แก้ไขสินค้าสำเร็จ' : 'เพิ่มสินค้าสำเร็จ', timer: 1500, showConfirmButton: false })
  } catch (e) {
    formError.value = e.response?.data?.message || 'บันทึกไม่สำเร็จ'
  } finally {
    saving.value = false
  }
}

async function remove(p) {
  const r = await Swal.fire({
    icon: 'warning',
    title: `ลบ "${p.name}" ?`,
    text: 'การลบไม่สามารถย้อนกลับได้',
    showCancelButton: true,
    confirmButtonText: 'ลบสินค้า',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#dc2626',
  })
  if (!r.isConfirmed) return
  try {
    await http.delete(`/products/${p.id}`)
    await loadProducts()
    Swal.fire({ icon: 'success', title: 'ลบสินค้าสำเร็จ', timer: 1200, showConfirmButton: false })
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'ลบไม่สำเร็จ', text: e.response?.data?.message || '' })
  }
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
        <h1 class="font-bold text-[#14532D] text-lg">จัดการสินค้า (Admin)</h1>
        <nav class="flex items-center gap-3 text-sm">
          <RouterLink to="/" class="hover:underline">หน้าแรก</RouterLink>
          <button @click="onLogout" class="border border-[#14532D] text-[#14532D] rounded-full px-4 py-1.5 hover:bg-[#F6F9F4]">
            ออกจากระบบ
          </button>
        </nav>
      </div>
    </header>

    <main class="max-w-6xl mx-auto px-5 py-8">
      <div class="flex flex-wrap items-center gap-3 justify-between">
        <input v-model="search" type="search" placeholder="ค้นหาชื่อ รายละเอียด หรือรหัสสินค้า"
          class="w-full sm:w-80 border rounded-full px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-green-400" />
        <button @click="openAdd" class="bg-[#14532D] text-white rounded-full px-5 py-2 hover:bg-[#0f4023]">
          เพิ่มสินค้า
        </button>
      </div>

      <div class="mt-6 bg-white rounded-2xl overflow-x-auto">
        <table class="w-full text-sm min-w-[640px]">
          <thead class="text-left bg-[#E3F0E6]">
            <tr>
              <th class="px-4 py-3">รหัส</th>
              <th class="px-4 py-3">ชื่อสินค้า</th>
              <th class="px-4 py-3 text-right">ราคา (฿)</th>
              <th class="px-4 py-3 text-right">สต็อก</th>
              <th class="px-4 py-3 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading"><td colspan="5" class="px-4 py-8 text-center text-gray-500">กำลังโหลด...</td></tr>
            <tr v-else-if="products.length === 0">
              <td colspan="5" class="px-4 py-8 text-center text-gray-500">
                {{ search ? 'ไม่พบสินค้าที่ตรงกับคำค้นหา' : 'ยังไม่มีสินค้า กดปุ่ม "เพิ่มสินค้า" เพื่อเริ่มต้น' }}
              </td>
            </tr>
            <tr v-for="p in products" :key="p.id" class="border-t">
              <td class="px-4 py-3">{{ p.id }}</td>
              <td class="px-4 py-3">
                <div class="font-medium">{{ p.name }}</div>
                <div class="text-xs text-gray-500 line-clamp-1">{{ p.description }}</div>
              </td>
              <td class="px-4 py-3 text-right">{{ baht(p.price) }}</td>
              <td class="px-4 py-3 text-right" :class="p.stock === 0 ? 'text-red-600 font-medium' : ''">{{ p.stock }}</td>
              <td class="px-4 py-3 text-right whitespace-nowrap">
                <button @click="openEdit(p)" class="text-[#14532D] hover:underline mr-3">แก้ไข</button>
                <button @click="remove(p)" class="text-red-600 hover:underline">ลบ</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>

    <!-- Modal เพิ่ม/แก้ไข -->
    <div v-if="showModal" class="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
      @click.self="showModal = false">
      <form @submit.prevent="save" class="bg-white rounded-2xl w-full max-w-md p-6 space-y-3">
        <h2 class="font-bold text-lg">{{ editingId ? `แก้ไขสินค้า #${editingId}` : 'เพิ่มสินค้า' }}</h2>
        <div v-if="formError" class="bg-red-50 text-red-600 text-sm rounded p-2">{{ formError }}</div>

        <div>
          <label class="block text-sm mb-1">ชื่อสินค้า *</label>
          <input v-model="form.name" class="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400" />
        </div>
        <div>
          <label class="block text-sm mb-1">รายละเอียด</label>
          <textarea v-model="form.description" rows="3" class="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"></textarea>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm mb-1">ราคา (฿) *</label>
            <input v-model="form.price" type="number" min="0" step="0.01" class="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div>
            <label class="block text-sm mb-1">สต็อก *</label>
            <input v-model="form.stock" type="number" min="0" step="1" class="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
        </div>
        <div>
          <label class="block text-sm mb-1">ลิงก์รูปสินค้า</label>
          <input v-model="form.image_url" placeholder="https://..." class="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400" />
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button type="button" @click="showModal = false" class="px-4 py-2 rounded-full hover:bg-gray-100">ยกเลิก</button>
          <button :disabled="saving" class="bg-[#14532D] text-white rounded-full px-5 py-2 disabled:opacity-60">
            {{ saving ? 'กำลังบันทึก...' : 'บันทึก' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>