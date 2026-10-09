const router = require("express").Router();
const pool = require("../db");
const { verifyToken } = require("../middleware/auth");

const METHODS = ["bank_transfer", "promptpay"];
const REF_RE = /^[A-Za-z0-9-]{6,30}$/;

// POST /api/payments   body: { order_id, payment_method, transaction_ref }
// จำนวนเงินอ่านจากตาราง orders เอง ไม่รับจากหน้าเว็บ
router.post("/", verifyToken, async (req, res) => {
  const orderId = Number(req.body.order_id);
  const method = req.body.payment_method;
  const ref = String(req.body.transaction_ref || "").trim();

  if (!Number.isInteger(orderId) || orderId < 1)
    return res.status(400).json({ message: "รหัสออร์เดอร์ไม่ถูกต้อง" });
  if (!METHODS.includes(method))
    return res.status(400).json({ message: "วิธีชำระเงินไม่ถูกต้อง" });
  if (!REF_RE.test(ref))
    return res.status(400).json({ message: "เลขที่อ้างอิงต้องเป็น a-z, 0-9, - ความยาว 6-30 ตัว" });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      "SELECT order_id, user_id, total_amount, status FROM orders WHERE order_id = ? FOR UPDATE",
      [orderId]
    );
    const order = rows[0];
    if (!order || order.user_id !== req.user.user_id) {
      await conn.rollback();
      return res.status(404).json({ message: "ไม่พบออร์เดอร์" });
    }
    if (order.status !== "pending") {
      await conn.rollback();
      return res.status(400).json({ message: "ออร์เดอร์นี้ไม่อยู่ในสถานะรอชำระเงิน" });
    }

    const [dup] = await conn.query(
      "SELECT payment_id FROM payments WHERE transaction_ref = ? LIMIT 1",
      [ref]
    );
    if (dup.length > 0) {
      await conn.rollback();
      return res.status(409).json({ message: "เลขที่อ้างอิงนี้ถูกใช้แล้ว" });
    }

    const [p] = await conn.query(
      `INSERT INTO payments (order_id, amount, payment_method, payment_status, transaction_ref, payment_date)
       VALUES (?, ?, ?, 'success', ?, NOW())`,
      [order.order_id, order.total_amount, method, ref]
    );
    await conn.query("UPDATE orders SET status = 'paid' WHERE order_id = ?", [order.order_id]);

    await conn.commit();
    res.status(201).json({ message: "ชำระเงินสำเร็จ", payment_id: p.insertId, order_id: order.order_id });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์" });
  } finally {
    conn.release();
  }
});

// GET /api/payments/order/:orderId  (เจ้าของออร์เดอร์หรือ admin)
router.get("/order/:orderId", verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.payment_id, p.order_id, p.amount, p.payment_method, p.payment_status,
              p.transaction_ref, p.payment_date, o.user_id
       FROM payments p JOIN orders o ON o.order_id = p.order_id
       WHERE p.order_id = ? AND p.payment_status = 'success'
       ORDER BY p.payment_id DESC LIMIT 1`,
      [req.params.orderId]
    );
    const pay = rows[0];
    if (!pay) return res.status(404).json({ message: "ไม่พบข้อมูลการชำระเงิน" });
    if (pay.user_id !== req.user.user_id && req.user.role !== "admin")
      return res.status(403).json({ message: "ไม่มีสิทธิ์ดูข้อมูลนี้" });
    delete pay.user_id;
    res.json(pay);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์" });
  }
});

module.exports = router;