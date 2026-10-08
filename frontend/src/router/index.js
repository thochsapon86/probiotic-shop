import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'landing', component: () => import('../views/LandingView.vue') },
    { path: '/login', name: 'login', component: () => import('../views/LoginView.vue'), meta: { guestOnly: true } },
    { path: '/register', name: 'register', component: () => import('../views/RegisterView.vue'), meta: { guestOnly: true } },
    { path: '/admin/products', name: 'admin-products', component: () => import('../views/AdminProductsView.vue'), meta: { requiresAuth: true, requiresAdmin: true } },
    { path: '/contact', name: 'contact', component: () => import('../views/ContactView.vue') },
    { path: '/products', name: 'products', component: () => import('../views/ProductView.vue'), meta: { requiresAuth: true }, },
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