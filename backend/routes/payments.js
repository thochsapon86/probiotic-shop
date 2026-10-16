const router = require("express").Router();
const fs = require("fs");
const PDFDocument = require("pdfkit");
const pool = require("../db");
const { verifyToken } = require("../middleware/auth");

const METHODS = ["bank_transfer", "promptpay"];
const REF_RE = /^[A-Za-z0-9-]{6,30}$/;

// POST /api/payments   body: { order_id, payment_method, transaction_ref }
// จำนวนเงินอ่านจากตาราง orders เอง ไม่รับจากหน้าเว็บ
router.post("/", verifyToken, async (req, res) => {
  if (req.user.role === "admin")
    return res.status(403).json({ message: "Admin ไม่สามารถชำระเงินแทนลูกค้าได้" });

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

// GET /api/payments/order/:orderId/receipt
// สร้างใบเสร็จจากข้อมูลในฐานข้อมูล และอนุญาตเฉพาะเจ้าของออร์เดอร์หรือ admin
router.get("/order/:orderId/receipt", verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.payment_id, p.order_id, p.amount, p.payment_method, p.transaction_ref, p.payment_date,
              o.user_id, o.order_date, u.username, u.full_name, u.email
       FROM payments p
       JOIN orders o ON o.order_id = p.order_id
       JOIN users u ON u.user_id = o.user_id
       WHERE p.order_id = ? AND p.payment_status = 'success'
       ORDER BY p.payment_id DESC LIMIT 1`,
      [req.params.orderId]
    );
    const payment = rows[0];
    if (!payment) return res.status(404).json({ message: "ไม่พบข้อมูลการชำระเงิน" });
    if (payment.user_id !== req.user.user_id && req.user.role !== "admin")
      return res.status(403).json({ message: "ไม่มีสิทธิ์ดูใบเสร็จนี้" });

    const [items] = await pool.query(
      `SELECT d.product_id, p.name, d.quantity, d.price_at_order,
              (d.quantity * d.price_at_order) AS subtotal
       FROM order_details d
       JOIN products p ON p.product_id = d.product_id
       WHERE d.order_id = ?
       ORDER BY d.order_detail_id`,
      [req.params.orderId]
    );

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    // เลือกฟอนต์ที่รองรับภาษาไทย โดยให้กำหนด path เองผ่าน env ได้ก่อน
    const fontCandidates = [
      process.env.PDF_FONT_PATH,
      "C:\\Windows\\Fonts\\LeelawUI.ttf",
      "C:\\Windows\\Fonts\\tahoma.ttf",
      "C:\\Windows\\Fonts\\arial.ttf",
    ].filter(Boolean);
    const fontPath = fontCandidates.find((candidate) => fs.existsSync(candidate));
    if (fontPath && fs.existsSync(fontPath)) doc.font(fontPath);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=receipt-order-${payment.order_id}.pdf`);
    doc.pipe(res);

    const money = (value) => Number(value || 0).toFixed(2);
    const dateText = new Date(payment.payment_date).toLocaleString("en-GB");
    doc.fontSize(20).text("PROBIOTIC SHOP", { align: "center" });
    doc.moveDown(0.4).fontSize(16).text("PAYMENT RECEIPT", { align: "center" });
    doc.moveDown();
    doc.fontSize(10)
      .text(`Receipt no.: ${payment.payment_id}`)
      .text(`Order no.: ${payment.order_id}`)
      .text(`Customer: ${payment.full_name || payment.username}`)
      .text(`Email: ${payment.email}`)
      .text(`Payment date: ${dateText}`)
      .text(`Payment method: ${payment.payment_method}`)
      .text(`Transaction ref.: ${payment.transaction_ref}`);
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);
    const table = { productX: 50, productWidth: 260, qtyX: 320, qtyWidth: 55, amountX: 390, amountWidth: 155 };
    const drawTableRow = (name, quantity, subtotal) => {
      const y = doc.y;
      const nameHeight = doc.heightOfString(name, { width: table.productWidth });
      doc.text(name, table.productX, y, { width: table.productWidth });
      doc.text(quantity, table.qtyX, y, { width: table.qtyWidth, align: "right" });
      doc.text(subtotal, table.amountX, y, { width: table.amountWidth, align: "right" });
      doc.y = y + Math.max(18, nameHeight + 4);
    };
    doc.fontSize(10);
    drawTableRow("Product", "Qty", "Subtotal (THB)");
    doc.moveDown(0.35);
    for (const item of items) {
      drawTableRow(`${item.name} (#${item.product_id})`, String(item.quantity), money(item.subtotal));
      doc.moveDown(0.2);
    }
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5).fontSize(14).text(`TOTAL: THB ${money(payment.amount)}`, 50, doc.y, { width: 495, align: "right" });
    doc.moveDown(2).fontSize(10).text("Thank you for your purchase.", { align: "center" });
    doc.end();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ message: "ไม่สามารถสร้างใบเสร็จ PDF ได้" });
  }
});

module.exports = router;
