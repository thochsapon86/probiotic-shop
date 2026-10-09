const router = require("express").Router();
const pool = require("../db");
const { verifyToken } = require("../middleware/auth");

class OrderError extends Error {}

// POST /api/orders   body: { items: [{ product_id, quantity }] }
// ผู้สั่งซื้อ = user_id จาก JWT, ราคา = ราคาจากตาราง products (ไม่เชื่อราคาจากหน้าเว็บ)
router.post("/", verifyToken, async (req, res) => {
  const raw = Array.isArray(req.body.items) ? req.body.items : [];
  if (raw.length === 0) return res.status(400).json({ message: "ตะกร้าสินค้าว่าง" });

  // รวมสินค้ารหัสซ้ำ และตรวจรูปแบบข้อมูล
  const wanted = new Map();
  for (const it of raw) {
    const pid = Number(it.product_id);
    const qty = Number(it.quantity);
    if (!Number.isInteger(pid) || pid < 1 || !Number.isInteger(qty) || qty < 1 || qty > 99)
      return res.status(400).json({ message: "ข้อมูลสินค้าไม่ถูกต้อง (จำนวนต้องเป็น 1-99)" });
    wanted.set(pid, (wanted.get(pid) || 0) + qty);
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let totalSatang = 0;
    const lines = [];
    // เรียงตามรหัสเพื่อลดโอกาสเกิด deadlock
    for (const [pid, qty] of [...wanted.entries()].sort((a, b) => a[0] - b[0])) {
      const [rows] = await conn.query(
        "SELECT product_id, name, price, stock, is_active FROM products WHERE product_id = ? FOR UPDATE",
        [pid]
      );
      const p = rows[0];
      if (!p || !p.is_active) throw new OrderError(`ไม่พบสินค้ารหัส ${pid} หรือหยุดจำหน่ายแล้ว`);
      if (p.stock < qty) throw new OrderError(`สินค้า "${p.name}" เหลือในสต็อก ${p.stock} ชิ้น`);
      totalSatang += Math.round(Number(p.price) * 100) * qty;
      lines.push({ pid, qty, price: p.price });
    }
    const total = totalSatang / 100;

    const [o] = await conn.query(
      "INSERT INTO orders (user_id, order_date, total_amount, status) VALUES (?, NOW(), ?, 'pending')",
      [req.user.user_id, total]
    );
    const orderId = o.insertId;

    for (const l of lines) {
      await conn.query(
        "INSERT INTO order_details (order_id, product_id, quantity, price_at_order) VALUES (?, ?, ?, ?)",
        [orderId, l.pid, l.qty, l.price]
      );
      await conn.query("UPDATE products SET stock = stock - ? WHERE product_id = ?", [l.qty, l.pid]);
    }

    await conn.commit();
    res.status(201).json({ message: "สร้างออร์เดอร์สำเร็จ", order_id: orderId, total_amount: total });
  } catch (err) {
    await conn.rollback();
    if (err instanceof OrderError) return res.status(400).json({ message: err.message });
    console.error(err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์" });
  } finally {
    conn.release();
  }
});

// GET /api/orders/:id  (เจ้าของออร์เดอร์หรือ admin เท่านั้น)
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT o.order_id, o.user_id, o.order_date, o.total_amount, o.status,
              u.full_name, u.username, u.phone, u.address
       FROM orders o JOIN users u ON u.user_id = o.user_id
       WHERE o.order_id = ?`,
      [req.params.id]
    );
    const order = rows[0];
    if (!order) return res.status(404).json({ message: "ไม่พบออร์เดอร์" });
    if (order.user_id !== req.user.user_id && req.user.role !== "admin")
      return res.status(403).json({ message: "ไม่มีสิทธิ์ดูออร์เดอร์นี้" });

    const [items] = await pool.query(
      `SELECT d.order_detail_id, d.product_id, p.name, d.quantity, d.price_at_order,
              (d.quantity * d.price_at_order) AS subtotal
       FROM order_details d JOIN products p ON p.product_id = d.product_id
       WHERE d.order_id = ?`,
      [req.params.id]
    );
    res.json({ ...order, items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์" });
  }
});

module.exports = router;