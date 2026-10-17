// รวม route ทุกหน้าและป้องกันหน้าที่ต้อง Login/Admin ด้วย navigation guard
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'landing', component: () => import('../views/LandingView.vue') },
    { path: '/login', name: 'login', component: () => import('../views/LoginView.vue'), meta: { guestOnly: true } },
    { path: '/register', name: 'register', component: () => import('../views/RegisterView.vue'), meta: { guestOnly: true } },
    { path: '/forgot-password', name: 'forgot-password', component: () => import('../views/ForgotPasswordView.vue'), meta: { guestOnly: true } },
    { path: '/reset-password', name: 'reset-password', component: () => import('../views/ResetPasswordView.vue'), meta: { guestOnly: true } },
    { path: '/admin/products', name: 'admin-products', component: () => import('../views/AdminProductsView.vue'), meta: { requiresAuth: true, requiresAdmin: true } },
    { path: '/admin/dashboard', name: 'admin-dashboard', component: () => import('../views/DashboardView.vue'), meta: { requiresAuth: true, requiresAdmin: true } },
    { path: '/admin/orders', name: 'admin-orders', component: () => import('../views/AdminOrdersView.vue'), meta: { requiresAuth: true, requiresAdmin: true } },
    // รองรับลิงก์เดิม โดยพากลับมาหน้า Cart ที่รวมรายการออเดอร์ไว้แล้ว
    { path: '/my-orders', name: 'my-orders', redirect: { name: 'cart' }, meta: { requiresAuth: true } },
    { path: '/contact', name: 'contact', component: () => import('../views/ContactView.vue') },
    { path: '/products', name: 'products', component: () => import('../views/ProductView.vue'), meta: { requiresAuth: true }, },
    { path: '/cart', name: 'cart', component: () => import('../views/CartView.vue'), meta: { requiresAuth: true } },
    { path: '/orders/:id', name: 'order-summary', component: () => import('../views/OrderSummaryView.vue'), meta: { requiresAuth: true } },
    { path: '/orders/:id/pay', name: 'payment', component: () => import('../views/PaymentView.vue'), meta: { requiresAuth: true } },
    { path: '/orders/:id/success', name: 'payment-success', component: () => import('../views/PaymentSuccessView.vue'), meta: { requiresAuth: true } },
    // หน้าถัดไป (ตัวอย่าง)
    // { path: '/products', component: ..., meta: { requiresAuth: true } },
    // { path: '/admin/products', component: ..., meta: { requiresAuth: true, requiresAdmin: true } },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isLoggedIn) return { name: 'login' }
  if (to.meta.requiresAdmin && !auth.isAdmin) return { path: '/' }
  if (to.meta.guestOnly && auth.isLoggedIn) return { path: '/' }
})

export default router
