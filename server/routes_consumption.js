import { Router } from 'express';
import db from './db.js';
import { authMiddleware } from './middleware.js';

const router = Router();

router.use(authMiddleware);

// Get consumption data for charts
router.get('/consumption', (req, res) => {
  const accountNumber = req.user.account_number;
  const { months = 12 } = req.query;
  
  const bills = db.prepare(`
    SELECT billing_period, consumption_kwh, total_amount, due_date, status
    FROM bills 
    WHERE account_number = ? 
    ORDER BY due_date ASC 
    LIMIT ?
  `).all(accountNumber, parseInt(months));
  
  // Calculate statistics
  const consumptions = bills.map(b => b.consumption_kwh);
  const amounts = bills.map(b => b.total_amount);
  
  const current = consumptions[consumptions.length - 1] || 0;
  const previous = consumptions[consumptions.length - 2] || 0;
  const average = consumptions.length > 0 ? consumptions.reduce((a, b) => a + b, 0) / consumptions.length : 0;
  const highest = consumptions.length > 0 ? Math.max(...consumptions) : 0;
  const lowest = consumptions.length > 0 ? Math.min(...consumptions) : 0;
  
  const changePercent = previous > 0 ? ((current - previous) / previous * 100).toFixed(1) : 0;
  
  // Generate recommendations
  const recommendations = [];
  if (changePercent > 10) {
    recommendations.push({
      type: 'warning',
      title: 'High Consumption Increase',
      message: 'Your electricity usage increased significantly this month. Consider reducing air-conditioner usage during peak hours (10 AM - 3 PM).'
    });
  } else if (changePercent > 5) {
    recommendations.push({
      type: 'info',
      title: 'Consumption Increased',
      message: 'Your electricity usage increased this month. Try unplugging appliances when not in use and use LED bulbs.'
    });
  } else if (changePercent < -5) {
    recommendations.push({
      type: 'success',
      title: 'Great Job!',
      message: 'Your electricity consumption decreased this month. Keep up the energy-saving habits!'
    });
  } else {
    recommendations.push({
      type: 'info',
      title: 'Stable Consumption',
      message: 'Your electricity usage is stable. Consider using timer plugs for appliances and switching to energy-efficient models.'
    });
  }
  
  // Monthly data for charts
  const monthlyData = bills.map(b => ({
    month: b.billing_period,
    consumption: b.consumption_kwh,
    amount: b.total_amount,
    status: b.status
  }));
  
  res.json({
    monthlyData,
    stats: {
      current,
      previous,
      average: Math.round(average),
      highest,
      lowest,
      changePercent: parseFloat(changePercent)
    },
    recommendations
  });
});

// Get meter readings
router.get('/meter-readings', (req, res) => {
  const accountNumber = req.user.account_number;
  const { limit = 24 } = req.query;
  
  const readings = db.prepare(`
    SELECT * FROM meter_readings 
    WHERE account_number = ? 
    ORDER BY reading_date DESC 
    LIMIT ?
  `).all(accountNumber, parseInt(limit));
  
  res.json({ readings });
});

export default router;