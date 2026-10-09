// แปลง path รูปจากฐานข้อมูลให้เป็น URL ที่เบราว์เซอร์โหลดได้
// - '/uploads/products/xxx.jpg' (รูปที่อัปโหลด) -> http://localhost:3000/uploads/products/xxx.jpg
// - 'https://...' (ลิงก์ภายนอกที่มีมาก่อน) -> ใช้ตามเดิม
const API_ORIGIN = new URL(import.meta.env.VITE_API_URL, window.location.origin).origin

export function imageSrc(url) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return API_ORIGIN + url
}