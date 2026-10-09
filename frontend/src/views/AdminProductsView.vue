<script setup>
import AppNavbar from '../components/AppNavbar.vue'
import { imageSrc } from '../utils/imageUrl'
import { ref, computed, onMounted, watch } from 'vue'
import Swal from 'sweetalert2'
import http from '../api/http'


const products = ref([])
const search = ref('')
const loading = ref(false)

const showModal = ref(false)
const editingId = ref(null)
const saving = ref(false)
const formError = ref('')
const emptyForm = () => ({ name: '', description: '', price: '', stock: '' })
const form = ref(emptyForm())

// ---- รูปสินค้า ----
const imageFile = ref(null)
const imagePreview = ref('')
const currentImage = ref('')
const removeImage = ref(false)
const shownImage = computed(() =>
  imagePreview.value || (removeImage.value ? '' : imageSrc(currentImage.value))
)

function resetImage(current) {
  if (imagePreview.value) URL.revokeObjectURL(imagePreview.value)
  imageFile.value = null
  imagePreview.value = ''
  currentImage.value = current || ''
  removeImage.value = false
}

function onFileChange(e) {
  const file = e.target.files[0]
  formError.value = ''
  if (!file) return resetImage(currentImage.value)
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    formError.value = 'อนุญาตเฉพาะไฟล์ JPG, PNG, WEBP'
    e.target.value = ''
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    formError.value = 'ไฟล์รูปต้องมีขนาดไม่เกิน 2 MB'
    e.target.value = ''
    return
  }
  if (imagePreview.value) URL.revokeObjectURL(imagePreview.value)
  imageFile.value = file
  imagePreview.value = URL.createObjectURL(file)
  removeImage.value = false
}

function buildFormData(f) {
  const fd = new FormData()
  fd.append('name', f.name.trim())
  fd.append('description', f.description || '')
  fd.append('price', f.price)
  fd.append('stock', f.stock)
  if (imageFile.value) fd.append('image', imageFile.value)
  else if (removeImage.value) fd.append('remove_image', '1')
  return fd
}

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
  resetImage('')
  formError.value = ''
  showModal.value = true
}

function openEdit(p) {
  editingId.value = p.product_id
  form.value = {
    name: p.name,
    description: p.description || '',
    price: p.price,
    stock: p.stock,
  }
  resetImage(p.image_url)
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
    const fd = buildFormData(f)
    if (editingId.value) await http.put(`/products/${editingId.value}`, fd)
    else await http.post('/products', fd)
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
    await http.delete(`/products/${p.product_id}`)
    await loadProducts()
    Swal.fire({ icon: 'success', title: 'ลบสินค้าสำเร็จ', timer: 1200, showConfirmButton: false })
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'ลบไม่สำเร็จ', text: e.response?.data?.message || '' })
  }
}


const baht = (n) => Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2 })
</script>

<template>
  <div class="min-h-screen bg-[#F6F9F4] text-[#17302A]">
    <AppNavbar />

    <main class="max-w-6xl mx-auto px-5 py-8">
      <h1 class="text-3xl font-bold mb-6">จัดการสินค้า</h1>
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
            <tr v-for="p in products" :key="p.product_id" class="border-t">
              <td class="px-4 py-3">{{ p.product_id }}</td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg bg-[#E3F0E6] overflow-hidden shrink-0">
                    <img v-if="p.image_url" :src="imageSrc(p.image_url)" :alt="p.name" class="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <div class="min-w-0">
                    <div class="font-medium">{{ p.name }}</div>
                    <div class="text-xs text-gray-500 line-clamp-1">{{ p.description }}</div>
                  </div>
                </div>
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
          <label class="block text-sm mb-1">รูปสินค้า</label>
          <div class="flex items-center gap-3">
            <div class="w-20 h-20 rounded-xl bg-[#E3F0E6] overflow-hidden shrink-0 flex items-center justify-center text-xs text-[#14532D]/60">
              <img v-if="shownImage" :src="shownImage" alt="ตัวอย่างรูปสินค้า" class="w-full h-full object-cover" />
              <span v-else>ไม่มีรูป</span>
            </div>
            <div class="space-y-1">
              <input type="file" accept="image/jpeg,image/png,image/webp" @change="onFileChange" class="block text-sm w-full" />
              <p class="text-xs text-gray-500">JPG, PNG, WEBP ขนาดไม่เกิน 2 MB</p>
              <label v-if="currentImage && !imageFile" class="flex items-center gap-1 text-xs text-red-600">
                <input type="checkbox" v-model="removeImage" /> ลบรูปปัจจุบัน
              </label>
            </div>
          </div>
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