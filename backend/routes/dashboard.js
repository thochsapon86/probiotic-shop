// Route Dashboard สำหรับ Admin ใช้รวมยอดขายและสถิติสินค้า
const router = require("express").Router();
const pool = require("../db");
const { verifyToken, requireAdmin } = require("../middleware/auth");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value) {
  if (!DATE_RE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function defaultDateRange() {
  const today = new Date();
  const from = new Date(today);
  from.setDate(today.getDate() - 6);
  return {
    from: from.toISOString().slice(0, 10),
    to: today.toISOString().slice(0, 10),
  };
}

// GET /api/dashboard/sales?from=YYYY-MM-DD&to=YYYY-MM-DD
// ใช้รายการชำระเงินที่สำเร็จเป็นแหล่งข้อมูลยอดขาย เพื่อไม่รวมออร์เดอร์ pending/cancelled
router.get("/sales", verifyToken, requireAdmin, async (req, res) => {
  const defaults = defaultDateRange();
  const from = String(req.query.from || defaults.from);
  const to = String(req.query.to || defaults.to);

  if (!isValidDate(from) || !isValidDate(to) || from > to) {
    return res.status(400).json({ message: "ช่วงวันที่ไม่ถูกต้อง" });
  }

  try {
    const [summaryRows] = await pool.query(
      `SELECT COUNT(DISTINCT p.order_id) AS paid_orders,
              COALESCE(SUM(p.amount), 0) AS total_sales,
              COALESCE(AVG(p.amount), 0) AS average_order_value
       FROM payments p
       WHERE p.payment_status = 'success'
         AND p.payment_date >= ?
         AND p.payment_date < DATE_ADD(?, INTERVAL 1 DAY)`,
      [from, to]
    );

    const [dailyRows] = await pool.query(
      `SELECT DATE(p.payment_date) AS sale_date,
              COUNT(DISTINCT p.order_id) AS order_count,
              COALESCE(SUM(p.amount), 0) AS total_sales
       FROM payments p
       WHERE p.payment_status = 'success'
         AND p.payment_date >= ?
         AND p.payment_date < DATE_ADD(?, INTERVAL 1 DAY)
       GROUP BY DATE(p.payment_date)
       ORDER BY sale_date ASC`,
      [from, to]
    );

    const [productRows] = await pool.query(
      `SELECT d.product_id,
              COALESCE(p.name, CONCAT('สินค้า #', d.product_id)) AS product_name,
              SUM(d.quantity) AS sold_quantity,
              COALESCE(SUM(d.quantity * d.price_at_order), 0) AS total_sales
       FROM payments pay
       JOIN order_details d ON d.order_id = pay.order_id
       LEFT JOIN products p ON p.product_id = d.product_id
       WHERE pay.payment_status = 'success'
         AND pay.payment_date >= ?
         AND pay.payment_date < DATE_ADD(?, INTERVAL 1 DAY)
       GROUP BY d.product_id, p.name
       ORDER BY total_sales DESC, sold_quantity DESC`,
      [from, to]
    );

    res.json({
      from,
      to,
      summary: {
        paid_orders: Number(summaryRows[0].paid_orders),
        total_sales: Number(summaryRows[0].total_sales),
        average_order_value: Number(summaryRows[0].average_order_value),
      },
      daily_sales: dailyRows.map((row) => ({
        // รองรับทั้ง string และ Date ที่ mysql2 อาจคืนค่าตามชนิด connection setting
        date: row.sale_date instanceof Date
          ? row.sale_date.toISOString().slice(0, 10)
          : String(row.sale_date).slice(0, 10),
        order_count: Number(row.order_count),
        total_sales: Number(row.total_sales),
      })),
      product_sales: productRows.map((row) => ({
        product_id: Number(row.product_id),
        product_name: row.product_name,
        sold_quantity: Number(row.sold_quantity),
        total_sales: Number(row.total_sales),
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "ไม่สามารถโหลดข้อมูล Dashboard ได้" });
  }
});

module.exports = router;
