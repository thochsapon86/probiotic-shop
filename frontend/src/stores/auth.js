// Store token, ผู้ใช้ปัจจุบัน และออเดอร์ Pending ที่กลับมาชำระต่อได้
import { defineStore } from 'pinia'
import http from '../api/http'
import { useCartStore } from './cart'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || null,
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    pendingOrderId: localStorage.getItem('pendingOrderId') || null,
  }),
  getters: {
    isLoggedIn: (s) => !!s.token,
    isAdmin: (s) => s.user?.role === 'admin',
    hasPendingOrder: (s) => !!s.pendingOrderId,
  },
  actions: {
    async login(username, password) {
      // เรียก Login API แล้วเก็บ token/user เพื่อให้ Router และ request อื่นนำไปใช้
      const { data } = await http.post('/auth/login', { username, password })
      this.token = data.token
      this.user = data.user
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
    },
    setPendingOrder(orderId) {
      // เก็บเลข Order ไว้เพื่อแสดงปุ่มชำระเงินต่อ แม้ผู้ใช้เปลี่ยนหน้า
      this.pendingOrderId = String(orderId)
      localStorage.setItem('pendingOrderId', this.pendingOrderId)
    },
    clearPendingOrder() {
      this.pendingOrderId = null
      localStorage.removeItem('pendingOrderId')
    },
    logout() {
      // ล้าง session และ cart ทั้งหมดเมื่อออกจากระบบ
      this.token = null
      this.user = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      this.clearPendingOrder()
      useCartStore().clear()
  },
  },
})
