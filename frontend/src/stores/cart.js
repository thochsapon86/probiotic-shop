import { defineStore } from 'pinia'

const KEY = 'cart'

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: JSON.parse(localStorage.getItem(KEY) || '[]'),
  }),
  getters: {
    count: (s) => s.items.reduce((n, i) => n + i.quantity, 0),
    total: (s) => s.items.reduce((n, i) => n + i.price * i.quantity, 0),
  },
  actions: {
    save() {
      localStorage.setItem(KEY, JSON.stringify(this.items))
    },
    // เพิ่มสินค้าตามรหัส product_id คืนค่า false ถ้าเกินสต็อก
    add(p) {
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