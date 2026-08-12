import { Router } from 'express';
import db from './db.js';
import { authMiddleware } from './middleware.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get current user's bills
router.get('/', (req, res) => {
  const { status, limit = 50, offset = 0 } = req.query;
  const accountNumber = req.user.account_number;
  
  let query = 'SELECT * FROM bills WHERE account_number = ?';
  const params = [accountNumber];
  
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));
  
  const bills = db.prepare(query).all(...params);
  
  // Calculate totals
  const totalBills = db.prepare('SELECT COUNT(*) as c FROM bills WHERE account_number = ?').get(accountNumber).c;
  const unpaidCount = db.prepare("SELECT COUNT(*) as c FROM bills WHERE account_number = ? AND status = 'unpaid'").get(accountNumber).c;
  const overdueCount = db.prepare("SELECT COUNT(*) as c FROM bills WHERE account_number = ? AND status = 'overdue'").get(accountNumber).c;
  const totalUnpaidAmount = db.prepare("SELECT COALESCE(SUM(total_amount), 0) as total FROM bills WHERE account_number = ? AND status IN ('unpaid', 'overdue')").get(accountNumber).total;
  
  res.json({ bills, total: totalBills, unpaidCount, overdueCount, totalUnpaidAmount });
});

// Get bill summary for dashboard
router.get('/summary', (req, res) => {
  const accountNumber = req.user.account_number;
  
  const currentBill = db.prepare(
    "SELECT * FROM bills WHERE account_number = ? AND status IN ('unpaid', 'overdue') ORDER BY due_date ASC LIMIT 1"
  ).get(accountNumber);
  
  const previousBill = db.prepare(
    "SELECT * FROM bills WHERE account_number = ? AND status = 'paid' ORDER BY due_date DESC LIMIT 1"
  ).get(accountNumber);
  
  const totalUnpaid = db.prepare(
    "SELECT COALESCE(SUM(total_amount), 0) as total FROM bills WHERE account_number = ? AND status IN ('unpaid', 'overdue')"
  ).get(accountNumber);
  
  const totalConsumption = db.prepare(
    "SELECT COALESCE(SUM(consumption_kwh), 0) as total FROM bills WHERE account_number = ?"
  ).get(accountNumber);
  
  res.json({
    currentBill,
    previousBill,
    totalUnpaidAmount: totalUnpaid.total,
    totalConsumption: totalConsumption.total,
  });
});

// Get single bill with details
router.get('/:id', (req, res) => {
  const accountNumber = req.user.account_number;
  const bill = db.prepare('SELECT * FROM bills WHERE id = ? AND account_number = ?').get(req.params.id, accountNumber);
  
  if (!bill) {
    return res.status(404).json({ error: 'Bill not found' });
  }
  
  // Get payment info if paid
  let payment = null;
  if (bill.status === 'paid') {
    payment = db.prepare('SELECT * FROM payments WHERE bill_id = ?').get(bill.id);
  }
  
  // Get user info
  const user = db.prepare('SELECT * FROM users WHERE account_number = ?').get(accountNumber);
  
  res.json({ bill, payment, user });
});

// Download bill as PDF (generates HTML for printing)
router.get('/:id/download', (req, res) => {
  const accountNumber = req.user.account_number;
  const bill = db.prepare('SELECT * FROM bills WHERE id = ? AND account_number = ?').get(req.params.id, accountNumber);
  
  if (!bill) {
    return res.status(404).json({ error: 'Bill not found' });
  }
  
  const user = db.prepare('SELECT * FROM users WHERE account_number = ?').get(accountNumber);
  
  // Generate HTML for bill
  const html = generateBillHTML(bill, user);
  
  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Content-Disposition', `attachment; filename="bill-${bill.billing_period.replace(/\s+/g, '-')}.html"`);
  res.send(html);
});

function generateBillHTML(bill, user) {
  const formatCurrency = (amount) => `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>PowerLink PH - Electricity Bill</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .bill-container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
    .logo { color: #2563eb; font-size: 28px; font-weight: bold; margin-bottom: 5px; }
    .tagline { color: #666; font-size: 14px; }
    .bill-title { font-size: 24px; font-weight: bold; color: #1e3a8a; margin: 20px 0; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
    .info-box { background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
    .info-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
    .info-value { font-size: 16px; font-weight: 600; color: #1e293b; }
    .charges-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .charges-table th, .charges-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    .charges-table th { background: #f1f5f9; font-weight: 600; color: #334155; }
    .charges-table .amount { text-align: right; font-family: monospace; }
    .total-row { background: #fef3c7; font-weight: bold; }
    .grand-total { background: #1e3a8a; color: white; font-size: 18px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; }
    .payment-methods { margin-top: 20px; }
    .payment-methods h4 { color: #1e3a8a; margin-bottom: 10px; }
    .payment-methods ul { margin: 0; padding-left: 20px; }
    .payment-methods li { margin-bottom: 5px; }
    @media print { body { background: white; } .bill-container { box-shadow: none; padding: 0; } }
  </style>
</head>
<body>
  <div class="bill-container">
    <div class="header">
      <div class="logo">⚡ PowerLink PH</div>
      <div class="tagline">Philippine Electric Utility Corporation</div>
    </div>
    
    <div class="bill-title">ELECTRICITY BILLING STATEMENT</div>
    
    <div class="info-grid">
      <div class="info-box">
        <div class="info-label">Account Number</div>
        <div class="info-value">${user.account_number}</div>
      </div>
      <div class="info-box">
        <div class="info-label">Billing Period</div>
        <div class="info-value">${bill.billing_period}</div>
      </div>
      <div class="info-box">
        <div class="info-label">Customer Name</div>
        <div class="info-value">${user.full_name}</div>
      </div>
      <div class="info-box">
        <div class="info-label">Due Date</div>
        <div class="info-value">${formatDate(bill.due_date)}</div>
      </div>
      <div class="info-box">
        <div class="info-label">Service Address</div>
        <div class="info-value">${user.address}</div>
      </div>
      <div class="info-box">
        <div class="info-label">Payment Status</div>
        <div class="info-value" style="text-transform: capitalize;">${bill.status}</div>
      </div>
    </div>
    
    <h3 style="color: #1e3a8a; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">METER READING DETAILS</h3>
    <div class="info-grid">
      <div class="info-box">
        <div class="info-label">Previous Reading</div>
        <div class="info-value">${bill.previous_reading.toLocaleString()} kWh</div>
      </div>
      <div class="info-box">
        <div class="info-label">Current Reading</div>
        <div class="info-value">${bill.current_reading.toLocaleString()} kWh</div>
      </div>
      <div class="info-box">
        <div class="info-label">Total Consumption</div>
        <div class="info-value">${bill.consumption_kwh.toLocaleString()} kWh</div>
      </div>
      <div class="info-box">
        <div class="info-label">Reading Date</div>
        <div class="info-value">${formatDate(bill.created_at)}</div>
      </div>
    </div>
    
    <h3 style="color: #1e3a8a; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-top: 30px;">BILL BREAKDOWN</h3>
    <table class="charges-table">
      <thead>
        <tr>
          <th>Description</th>
          <th class="amount">Rate</th>
          <th class="amount">Consumption</th>
          <th class="amount">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Energy Charge</td>
          <td class="amount">₱11.50/kWh</td>
          <td class="amount">${bill.consumption_kwh} kWh</td>
          <td class="amount">${formatCurrency(bill.energy_charge)}</td>
        </tr>
        <tr>
          <td>Transmission Charge</td>
          <td class="amount">₱1.20/kWh</td>
          <td class="amount">${bill.consumption_kwh} kWh</td>
          <td class="amount">${formatCurrency(bill.transmission_charge)}</td>
        </tr>
        <tr>
          <td>Distribution Charge</td>
          <td class="amount">₱2.50/kWh</td>
          <td class="amount">${bill.consumption_kwh} kWh</td>
          <td class="amount">${formatCurrency(bill.distribution_charge)}</td>
        </tr>
        <tr>
          <td colspan="3"><strong>Subtotal</strong></td>
          <td class="amount"><strong>${formatCurrency(bill.energy_charge + bill.transmission_charge + bill.distribution_charge)}</strong></td>
        </tr>
        <tr>
          <td>Government Taxes (12% VAT)</td>
          <td class="amount"></td>
          <td class="amount"></td>
          <td class="amount">${formatCurrency(bill.taxes)}</td>
        </tr>
        <tr>
          <td>Other Charges (Fixed)</td>
          <td class="amount"></td>
          <td class="amount"></td>
          <td class="amount">${formatCurrency(bill.other_charges)}</td>
        </tr>
        <tr class="grand-total">
          <td colspan="3">TOTAL AMOUNT DUE</td>
          <td class="amount">${formatCurrency(bill.total_amount)}</td>
        </tr>
      </tbody>
    </table>
    
    <div class="payment-methods">
      <h4>Accepted Payment Methods</h4>
      <ul>
        <li>GCash</li>
        <li>Maya (formerly PayMaya)</li>
        <li>Credit/Debit Card (Visa, Mastercard)</li>
        <li>Bank Transfer (BPI, BDO, Metrobank, Landbank, PNB, UnionBank)</li>
      </ul>
    </div>
    
    <div class="footer">
      <p><strong>Important Reminders:</strong></p>
      <ul>
        <li>Please pay on or before the due date to avoid disconnection and penalties.</li>
        <li>Late payment penalty: 3% of outstanding balance per month.</li>
        <li>Present this bill when paying at authorized payment centers.</li>
        <li>For inquiries, contact PowerLink PH Customer Service at (02) 8888-8888 or email support@powerlink.ph</li>
        <li>This is a computer-generated bill. No signature required.</li>
      </ul>
      <p style="margin-top: 20px; text-align: center; color: #94a3b8;">
        PowerLink PH - Your Trusted Energy Partner<br>
        This is a demonstration project. Not an actual utility company.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

export default router;