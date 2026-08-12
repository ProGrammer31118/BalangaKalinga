import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from './db.js';
import { signToken } from './middleware.js';

const router = Router();

function publicUser(u) {
  return {
    id: u.id,
    full_name: u.full_name,
    email: u.email,
    mobile: u.mobile,
    address: u.address,
    account_number: u.account_number,
    role: u.role,
    status: u.status,
    created_at: u.created_at,
  };
}

router.post('/register', (req, res) => {
  const { 
    full_name, 
    email, 
    mobile, 
    address, 
    account_number, 
    password, 
    confirm_password 
  } = req.body || {};

  if (!full_name || !email || !mobile || !address || !account_number || !password || !confirm_password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (password !== confirm_password) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const emailExists = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (emailExists) return res.status(409).json({ error: 'Email already registered' });

  const accountExists = db.prepare('SELECT id FROM users WHERE account_number = ?').get(account_number);
  if (accountExists) return res.status(409).json({ error: 'Account number already registered' });

  const hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare(
      'INSERT INTO users (full_name, email, password_hash, mobile, address, account_number, role, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .run(full_name, email.toLowerCase(), hash, mobile, address, account_number, 'user', 'active');
  
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (user.status !== 'active') {
    return res.status(403).json({ error: 'Account is deactivated. Please contact support.' });
  }

  res.json({ token: signToken(user), user: publicUser(user) });
});

router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const token = authHeader.split(' ')[1];
  const jwt = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || 'powerlink-ph-secret-key-2024';
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: publicUser(user) });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

router.put('/profile', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const token = authHeader.split(' ')[1];
  const jwt = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || 'powerlink-ph-secret-key-2024';
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { full_name, email, mobile, address, current_password, new_password } = req.body || {};
    
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Check if email is taken by another user
    if (email && email !== user.email) {
      const emailExists = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
      if (emailExists) return res.status(409).json({ error: 'Email already in use' });
    }

    let updates = [];
    let params = [];

    if (full_name) {
      updates.push('full_name = ?');
      params.push(full_name);
    }
    if (email) {
      updates.push('email = ?');
      params.push(email.toLowerCase());
    }
    if (mobile) {
      updates.push('mobile = ?');
      params.push(mobile);
    }
    if (address) {
      updates.push('address = ?');
      params.push(address);
    }

    if (new_password) {
      if (!current_password) {
        return res.status(400).json({ error: 'Current password is required to change password' });
      }
      if (!bcrypt.compareSync(current_password, user.password_hash)) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
      if (new_password.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters' });
      }
      updates.push('password_hash = ?');
      params.push(bcrypt.hashSync(new_password, 10));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No changes provided' });
    }

    params.push(decoded.id);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    
    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
    res.json({ user: publicUser(updatedUser) });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

export default router;