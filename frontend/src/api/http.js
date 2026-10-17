// Axios instance กลางและ interceptor สำหรับแนบ JWT ให้ทุก request
import axios from 'axios'

const http = axios.create({ baseURL: import.meta.env.VITE_API_URL })

http.interceptors.request.use((config) => {
  // อ่าน token ล่าสุดจาก LocalStorage แล้วแนบเป็น Bearer token ให้ Backend ตรวจสิทธิ์
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default http
