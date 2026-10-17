// Store ตะกร้า: เพิ่ม/แก้จำนวน/ลบสินค้า และเก็บข้อมูลผ่าน LocalStorage
import { defineStore } from 'pinia'

const KEY = 'cart'

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: JSON.parse(localStorage.getItem(KEY) || '[]'),
  }),
  getters: {
    // getters คำนวณค่าจากรายการปัจจุบันแบบ reactive ทุกครั้งที่ items เปลี่ยน
    count: (s) => s.items.reduce((n, i) => n + i.quantity, 0),
    total: (s) => s.items.reduce((n, i) => n + i.price * i.quantity, 0),
  },
  actions: {
    save() {
      // ทำให้ตะกร้ายังอยู่หลัง refresh หรือเปลี่ยนหน้า
      localStorage.setItem(KEY, JSON.stringify(this.items))
    },
    // เพิ่มสินค้าตามรหัส product_id คืนค่า false ถ้าเกินสต็อก
    add(p) {
      // ถ้ามีสินค้าเดิมจะเพิ่มจำนวน แต่ไม่ให้เกิน stock ที่ API ส่งมา
      const found = this.items.find((i) => i.product_id === p.product_id)
      if (found) {
        if (found.quantity >= p.stock) return false
        found.quantity++
        found.stock = p.stock
      } else {
        if (p.stock < 1) return false
        this.items.push({
          product_id: p.product_id,
          name: p.name,
          price: Number(p.price),
          image_url: p.image_url,
          stock: p.stock,
          quantity: 1,
        })
      }
      this.save()
      return true
    },
    setQty(productId, qty) {
      // บังคับจำนวนให้อยู่ระหว่าง 1 ถึง stock และสูงสุด 99 ชิ้น
      const item = this.items.find((i) => i.product_id === productId)
      if (!item) return
      const n = Math.floor(Number(qty)) || 1
      item.quantity = Math.min(Math.max(n, 1), item.stock, 99)
      this.save()
    },
    remove(productId) {
      this.items = this.items.filter((i) => i.product_id !== productId)
      this.save()
    },
    clear() {
      this.items = []
      localStorage.removeItem(KEY)
    },
  },
})
