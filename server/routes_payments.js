import { Router } from 'express';
import db from './db.js';
import { authMiddleware } from './middleware.js';

const router = Router();

router.use(authMiddleware);

// Get user's payment history
router.get('/', (req, res) => {
  const { status, method, start_date, end_date, limit = 50, offset = 0 } = req.query;
  const accountNumber = req.user.account_number;
  
  let query = `
    SELECT p.*, b.billing_period 
    FROM payments p
    JOIN bills b ON p.bill_id = b.id
    WHERE p.account_number = ?
  `;
  const params = [accountNumber];
  
  if (status) {
    query += ' AND p.status = ?';
    params.push(status);
  }
  
  if (method) {
    query += ' AND p.payment_method = ?';
    params.push(method);
  }
  
  if (start_date) {
    query += ' AND p.payment_date >= ?';
    params.push(start_date);
  }
  
  if (end_date) {
    query += ' AND p.payment_date <= ?';
    params.push(end_date);
  }
  
  query += ' ORDER BY p.payment_date DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));
  
  const payments = db.prepare(query).all(...params);
  
  const total = db.prepare('SELECT COUNT(*) as c FROM payments WHERE account_number = ?').get(accountNumber).c;
  
  res.json({ payments, total });
});

// Get single payment with receipt
router.get('/:id', (req, res) => {
  const accountNumber = req.user.account_number;
  const payment = db.prepare(`
    SELECT p.*, b.billing_period, b.total_amount as bill_total, u.full_name, u.account_number
    FROM payments p
    JOIN bills b ON p.bill_id = b.id
    JOIN users u ON p.account_number = u.account_number
    WHERE p.id = ? AND p.account_number = ?
  `).get(req.params.id, accountNumber);
  
  if (!payment) {
    return res.status(404).json({ error: 'Payment not found' });
  }
  
  res.json({ payment });
});

// Generate payment receipt HTML
router.get('/:id/receipt', (req, res) => {
  const accountNumber = req.user.account_number;
  const payment = db.prepare(`
    SELECT p.*, b.billing_period, b.total_amount as bill_total, u.full_name, u.account_number, u.address
    FROM payments p
    JOIN bills b ON p.bill_id = b.id
    JOIN users u ON p.account_number = u.account_number
    WHERE p.id = ? AND p.account_number = ?
  `).get(req.params.id, accountNumber);
  
  if (!payment) {
    return res.status(404).json({ error: 'Payment not found' });
  }
  
  const html = generateReceiptHTML(payment);
  
  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Content-Disposition', `attachment; filename="receipt-${payment.transaction_id}.html"`);
  res.send(html);
});

// Process payment (mock)
router.post('/process', (req, res) => {
  const { bill_id, payment_method, payment_details } = req.body || {};
  const accountNumber = req.user.account_number;
  
  if (!bill_id || !payment_method) {
    return res.status(400).json({ error: 'Bill ID and payment method are required' });
  }
  
  const bill = db.prepare('SELECT * FROM bills WHERE id = ? AND account_number = ?').get(bill_id, accountNumber);
  
  if (!bill) {
    return res.status(404).json({ error: 'Bill not found' });
  }
  
  if (bill.status === 'paid') {
    return res.status(400).json({ error: 'Bill is already paid' });
  }
  
  // Mock payment processing - always succeeds for demo
  const transactionId = `TXN-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const paymentDate = new Date().toISOString().split('T')[0];
  
  // Insert payment record
  const insertPayment = db.prepare(
    'INSERT INTO payments (bill_id, account_number, amount, payment_method, transaction_id, payment_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  
  insertPayment.run(bill_id, accountNumber, bill.total_amount, payment_method, transactionId, paymentDate, 'completed');
  
  // Update bill status
  db.prepare("UPDATE bills SET status = 'paid' WHERE id = ?").run(bill_id);
  
  // Create notification
  db.prepare(
    'INSERT INTO notifications (user_id, title, message, type, is_read) VALUES (?, ?, ?, ?, ?)'
  ).run(
    req.user.id,
    'Payment Successful',
    `Your payment of ₱${bill.total_amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} for ${bill.billing_period} has been confirmed. Transaction ID: ${transactionId}`,
    'success',
    0
  );
  
  // Get the created payment
  const payment = db.prepare(`
    SELECT p.*, b.billing_period, u.full_name, u.account_number
    FROM payments p
    JOIN bills b ON p.bill_id = b.id
    JOIN users u ON p.account_number = u.account_number
    WHERE p.transaction_id = ?
  `).get(transactionId);
  
  res.json({ 
    success: true, 
    payment,
    message: 'Payment processed successfully'
  });
});

function generateReceiptHTML(payment) {
  const formatCurrency = (amount) => `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>PowerLink PH - Payment Receipt</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .receipt-container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
    .logo { color: #2563eb; font-size: 28px; font-weight: bold; margin-bottom: 5px; }
    .tagline { color: #666; font-size: 14px; }
    .receipt-title { font-size: 24px; font-weight: bold; color: #1e3a8a; margin: 20px 0; }
    .status-badge { display: inline-block; background: #dcfce7; color: #166534; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
    .info-box { background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
    .info-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
    .info-value { font-size: 15px; font-weight: 600; color: #1e293b; }
    .amount-large { font-size: 32px; font-weight: bold; color: #1e3a8a; text-align: center; padding: 20px; background: #fef3c7; border-radius: 12px; margin: 20px 0; }
    .qr-placeholder { text-align: center; margin: 20px 0; padding: 20px; background: #f8fafc; border-radius: 8px; border: 2px dashed #cbd5e1; }
    .qr-placeholder img { max-width: 150px; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; }
    @media print { body { background: white; } .receipt-container { box-shadow: none; padding: 0; } }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="header">
      <div class="logo">⚡ PowerLink PH</div>
      <div class="tagline">Philippine Electric Utility Corporation</div>
    </div>
    
    <div class="receipt-title">OFFICIAL PAYMENT RECEIPT</div>
    <div style="text-align: center; margin-bottom: 20px;">
      <span class="status-badge">✓ Payment Confirmed</span>
    </div>
    
    <div class="amount-large">
      ${formatCurrency(payment.amount)}
    </div>
    
    <div class="info-grid">
      <div class="info-box">
        <div class="info-label">Transaction ID</div>
        <div class="info-value">${payment.transaction_id}</div>
      </div>
      <div class="info-box">
        <div class="info-label">Payment Date</div>
        <div class="info-value">${formatDate(payment.payment_date)}</div>
      </div>
      <div class="info-box">
        <div class="info-label">Account Number</div>
        <div class="info-value">${payment.account_number}</div>
      </div>
      <div class="info-box">
        <div class="info-label">Customer Name</div>
        <div class="info-value">${payment.full_name}</div>
      </div>
      <div class="info-box">
        <div class="info-label">Billing Period</div>
        <div class="info-value">${payment.billing_period}</div>
      </div>
      <div class="info-box">
        <div class="info-label">Payment Method</div>
        <div class="info-value">${payment.payment_method}</div>
      </div>
    </div>
    
    <div class="qr-placeholder">
      <div style="font-size: 12px; color: #64748b; margin-bottom: 10px;">QR Code for Verification</div>
      <div style="font-family: monospace; font-size: 11px; color: #94a3b8;">
        ${payment.transaction_id} | ${payment.account_number} | ${formatCurrency(payment.amount)} | ${payment.payment_date}
      </div>
    </div>
    
    <div class="footer">
      <p><strong>PowerLink PH</strong> - Philippine Electric Utility Corporation</p>
      <p>This receipt serves as proof of payment for your electricity bill.</p>
      <p>For verification, visit <a href="https://powerlink.ph" style="color: #2563eb;">powerlink.ph</a> and enter Transaction ID: ${payment.transaction_id}</p>
      <p style="margin-top: 15px; color: #94a3b8;">
        This is a demonstration project. Not an actual utility company.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

export default router;