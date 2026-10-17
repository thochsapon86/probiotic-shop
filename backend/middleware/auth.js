// Middleware ตรวจ JWT และจำกัดสิทธิ์ของผู้ดูแลระบบ
const jwt = require('jsonwebtoken')

function verifyToken(req, res, next) {
  // อ่านค่า Authorization รูปแบบ "Bearer <jwt>" จาก request header
  // อ่าน Bearer token จาก header แล้วตรวจสอบลายเซ็นและวันหมดอายุด้วย JWT secret
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ message: 'กรุณาเข้าสู่ระบบ' })
  try {
    // jwt.verify จะตรวจทั้งลายเซ็นและวันหมดอายุ ถ้าผ่านจึงเก็บข้อมูลไว้ใน req.user
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ message: 'Token ไม่ถูกต้องหรือหมดอายุ' })
  }
}

function requireAdmin(req, res, next) {
  // Middleware นี้ทำงานหลัง verifyToken เพื่อเช็ก role ของผู้ใช้ที่ถูกยืนยันแล้ว
  // middleware นี้ต้องทำงานหลัง verifyToken เพื่อใช้ role ที่อยู่ใน req.user
  if (req.user?.role !== 'admin')
    return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' })
  next()
}

module.exports = { verifyToken, requireAdmin }
