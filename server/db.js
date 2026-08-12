import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, 'data', 'powerlink.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  mobile TEXT,
  address TEXT,
  account_number TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'user',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_number TEXT NOT NULL,
  billing_period TEXT NOT NULL,
  previous_reading INTEGER NOT NULL DEFAULT 0,
  current_reading INTEGER NOT NULL DEFAULT 0,
  consumption_kwh INTEGER NOT NULL DEFAULT 0,
  energy_charge REAL NOT NULL DEFAULT 0,
  transmission_charge REAL NOT NULL DEFAULT 0,
  distribution_charge REAL NOT NULL DEFAULT 0,
  taxes REAL NOT NULL DEFAULT 0,
  other_charges REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,
  due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unpaid',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (account_number) REFERENCES users(account_number)
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bill_id INTEGER NOT NULL,
  account_number TEXT NOT NULL,
  amount REAL NOT NULL,
  payment_method TEXT NOT NULL,
  transaction_id TEXT NOT NULL UNIQUE,
  payment_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (bill_id) REFERENCES bills(id),
  FOREIGN KEY (account_number) REFERENCES users(account_number)
);

CREATE TABLE IF NOT EXISTS meter_readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_number TEXT NOT NULL,
  previous_reading INTEGER NOT NULL DEFAULT 0,
  current_reading INTEGER NOT NULL DEFAULT 0,
  consumption INTEGER NOT NULL DEFAULT 0,
  reading_date TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (account_number) REFERENCES users(account_number)
);

CREATE TABLE IF NOT EXISTS electricity_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rate_per_kwh REAL NOT NULL,
  transmission_rate REAL NOT NULL DEFAULT 0,
  distribution_rate REAL NOT NULL DEFAULT 0,
  tax_rate REAL NOT NULL DEFAULT 0.12,
  effective_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
`);

function seed() {
  const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (userCount > 0) return;

  const adminHash = bcrypt.hashSync('admin123', 10);
  const userHash = bcrypt.hashSync('user123', 10);

  const insertUser = db.prepare(
    'INSERT INTO users (full_name, email, password_hash, mobile, address, account_number, role, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );

  // Admin user
  insertUser.run(
    'PowerLink Administrator',
    'admin@powerlink.ph',
    adminHash,
    '09171234567',
    'PowerLink PH Main Office, Makati City',
    'ADM-000001',
    'admin',
    'active'
  );

  // Sample customers
  const customers = [
    {
      name: 'Juan Dela Cruz',
      email: 'juan.delacruz@email.com',
      mobile: '09171234567',
      address: '123 Rizal Street, Barangay Poblacion, Manila',
      account: 'PL-2024-001234',
    },
    {
      name: 'Maria Santos',
      email: 'maria.santos@email.com',
      mobile: '09182345678',
      address: '456 Bonifacio Avenue, Quezon City',
      account: 'PL-2024-001235',
    },
    {
      name: 'Pedro Garcia',
      email: 'pedro.garcia@email.com',
      mobile: '09193456789',
      address: '789 Mabini Road, Makati City',
      account: 'PL-2024-001236',
    },
    {
      name: 'Ana Reyes',
      email: 'ana.reyes@email.com',
      mobile: '09204567890',
      address: '321 Luna Street, Pasig City',
      account: 'PL-2024-001237',
    },
    {
      name: 'Carlos Lopez',
      email: 'carlos.lopez@email.com',
      mobile: '09215678901',
      address: '654 Del Pilar Blvd, Mandaluyong',
      account: 'PL-2024-001238',
    },
  ];

  for (const c of customers) {
    insertUser.run(c.name, c.email, userHash, c.mobile, c.address, c.account, 'user', 'active');
  }

  // Electricity rates
  const insertRate = db.prepare(
    'INSERT INTO electricity_rates (rate_per_kwh, transmission_rate, distribution_rate, tax_rate, effective_date, status) VALUES (?, ?, ?, ?, ?, ?)'
  );
  insertRate.run(11.50, 1.20, 2.50, 0.12, '2024-01-01', 'active');
  insertRate.run(10.80, 1.15, 2.30, 0.12, '2023-01-01', 'inactive');
  insertRate.run(10.20, 1.10, 2.10, 0.12, '2022-01-01', 'inactive');

  // Sample bills for Juan Dela Cruz (PL-2024-001234)
  const insertBill = db.prepare(
    `INSERT INTO bills (account_number, billing_period, previous_reading, current_reading, consumption_kwh, 
      energy_charge, transmission_charge, distribution_charge, taxes, other_charges, total_amount, due_date, status) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const bills = [
    {
      account: 'PL-2024-001234',
      period: 'July 2024',
      prev: 12450,
      curr: 12735,
      due: '2024-08-20',
      status: 'unpaid',
    },
    {
      account: 'PL-2024-001234',
      period: 'June 2024',
      prev: 12180,
      curr: 12450,
      due: '2024-07-20',
      status: 'paid',
    },
    {
      account: 'PL-2024-001234',
      period: 'May 2024',
      prev: 11920,
      curr: 12180,
      due: '2024-06-20',
      status: 'paid',
    },
    {
      account: 'PL-2024-001234',
      period: 'April 2024',
      prev: 11680,
      curr: 11920,
      due: '2024-05-20',
      status: 'paid',
    },
    {
      account: 'PL-2024-001234',
      period: 'March 2024',
      prev: 11420,
      curr: 11680,
      due: '2024-04-20',
      status: 'paid',
    },
    {
      account: 'PL-2024-001234',
      period: 'February 2024',
      prev: 11180,
      curr: 11420,
      due: '2024-03-20',
      status: 'paid',
    },
    {
      account: 'PL-2024-001234',
      period: 'January 2024',
      prev: 10950,
      curr: 11180,
      due: '2024-02-20',
      status: 'paid',
    },
  ];

  for (const b of bills) {
    const consumption = b.curr - b.prev;
    const rate = 11.50;
    const transRate = 1.20;
    const distRate = 2.50;
    const taxRate = 0.12;
    
    const energyCharge = consumption * rate;
    const transmissionCharge = consumption * transRate;
    const distributionCharge = consumption * distRate;
    const subtotal = energyCharge + transmissionCharge + distributionCharge;
    const taxes = subtotal * taxRate;
    const otherCharges = 50.00; // Fixed charges
    const total = subtotal + taxes + otherCharges;

    insertBill.run(
      b.account,
      b.period,
      b.prev,
      b.curr,
      consumption,
      energyCharge,
      transmissionCharge,
      distributionCharge,
      taxes,
      otherCharges,
      total,
      b.due,
      b.status
    );
  }

  // Sample bills for other customers
  const otherAccounts = ['PL-2024-001235', 'PL-2024-001236', 'PL-2024-001237', 'PL-2024-001238'];
  const periods = ['July 2024', 'June 2024', 'May 2024', 'April 2024', 'March 2024', 'February 2024', 'January 2024'];
  
  for (const account of otherAccounts) {
    let prevReading = 10000 + Math.floor(Math.random() * 2000);
    for (let i = 0; i < periods.length; i++) {
      const currReading = prevReading + 200 + Math.floor(Math.random() * 150);
      const consumption = currReading - prevReading;
      const energyCharge = consumption * 11.50;
      const transmissionCharge = consumption * 1.20;
      const distributionCharge = consumption * 2.50;
      const subtotal = energyCharge + transmissionCharge + distributionCharge;
      const taxes = subtotal * 0.12;
      const otherCharges = 50.00;
      const total = subtotal + taxes + otherCharges;
      
      const month = 7 - i;
      const dueDate = `2024-${month.toString().padStart(2, '0')}-20`;
      const status = i === 0 ? 'unpaid' : 'paid';
      
      insertBill.run(
        account,
        periods[i],
        prevReading,
        currReading,
        consumption,
        energyCharge,
        transmissionCharge,
        distributionCharge,
        taxes,
        otherCharges,
        total,
        dueDate,
        status
      );
      
      prevReading = currReading;
    }
  }

  // Sample payments
  const insertPayment = db.prepare(
    'INSERT INTO payments (bill_id, account_number, amount, payment_method, transaction_id, payment_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );

  const paymentMethods = ['GCash', 'Maya', 'Credit/Debit Card', 'Bank Transfer'];
  
  // Get paid bills and create payments
  const paidBills = db.prepare("SELECT id, account_number, total_amount FROM bills WHERE status = 'paid'").all();
  
  for (const bill of paidBills) {
    const method = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
    const transactionId = `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const billDate = new Date(bill.id * 1000); // Mock date
    const paymentDate = new Date(billDate.getTime() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    insertPayment.run(
      bill.id,
      bill.account_number,
      bill.total_amount,
      method,
      transactionId,
      paymentDate,
      'completed'
    );
  }

  // Sample meter readings
  const insertReading = db.prepare(
    'INSERT INTO meter_readings (account_number, previous_reading, current_reading, consumption, reading_date) VALUES (?, ?, ?, ?, ?)'
  );

  for (const account of ['PL-2024-001234', 'PL-2024-001235', 'PL-2024-001236', 'PL-2024-001237', 'PL-2024-001238']) {
    let prev = 10000 + Math.floor(Math.random() * 2000);
    for (let i = 6; i >= 0; i--) {
      const curr = prev + 200 + Math.floor(Math.random() * 150);
      const month = 7 - i;
      const readingDate = `2024-${month.toString().padStart(2, '0')}-15`;
      insertReading.run(account, prev, curr, curr - prev, readingDate);
      prev = curr;
    }
  }

  // Sample notifications
  const insertNotification = db.prepare(
    'INSERT INTO notifications (user_id, title, message, type, is_read) VALUES (?, ?, ?, ?, ?)'
  );

  const users = db.prepare('SELECT id, account_number FROM users WHERE role = "user"').all();
  
  for (const user of users) {
    const notifs = [
      { title: 'New Bill Available', message: `Your July 2024 electricity bill of ₱2,450.00 is now available.`, type: 'info', read: 0 },
      { title: 'Upcoming Due Date', message: `Your bill is due on August 20, 2024. Please pay to avoid penalties.`, type: 'warning', read: 0 },
      { title: 'Payment Successful', message: `Your payment of ₱2,380.00 for June 2024 has been confirmed.`, type: 'success', read: 1 },
      { title: 'System Announcement', message: `Scheduled maintenance on August 15, 2024 from 12:00 AM - 4:00 AM.`, type: 'info', read: 1 },
    ];
    
    for (const n of notifs) {
      insertNotification.run(user.id, n.title, n.message, n.type, n.read);
    }
  }
}

seed();

export default db;