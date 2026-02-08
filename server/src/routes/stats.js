import express from 'express';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Transaction from '../models/Transaction.js';
import Layout from '../models/Layout.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

function startOfMonth(d){
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

async function getSalesPurchaseSeries(userId){
  // Monthly series: last 12 months including current month
  const uid = new mongoose.Types.ObjectId(userId);
  const now = new Date();
  const months = [];
  for(let i=11;i>=0;i--){
    const dt = new Date(now.getFullYear(), now.getMonth()-i, 1);
    months.push({
      key: `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`,
      label: dt.toLocaleString('en',{month:'short'}),
      start: dt,
      end: new Date(dt.getFullYear(), dt.getMonth()+1, 1)
    });
  }

  const agg = await Transaction.aggregate([
    { $match: { userId: uid, createdAt: { $gte: months[0].start } } },
    { $addFields: { ym: { $dateToString: { format: '%Y-%m', date: '$createdAt' } } } },
    { $group: { _id: { ym:'$ym', kind:'$kind' }, amount: { $sum: '$amount' } } }
  ]);

  const map = new Map();
  for(const r of agg){
    map.set(`${r._id.ym}:${r._id.kind}`, r.amount);
  }

  return months.map(m=>({
    label: m.label,
    sales: map.get(`${m.key}:Sale`) || 0,
    purchase: map.get(`${m.key}:Purchase`) || 0
  }));
}

async function getWeeklySalesPurchaseSeries(userId){
  // Weekly series: rolling last 7 days (including today) in a stable timezone.
  // Important: Don't build day buckets using server-local midnight, otherwise
  // transactions can collapse into a single day when server TZ differs.
  const uid = new mongoose.Types.ObjectId(userId);
  const TZ = process.env.MONGO_TZ || process.env.TZ || 'Asia/Kolkata';

  const fmtKey = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const fmtDay = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    weekday: 'short'
  });

  // Pull a slightly broader range (7 * 24h) and rely on dayKey bucketing.
  const since = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);

  const agg = await Transaction.aggregate([
    { $match: { userId: uid, createdAt: { $gte: since } } },
    {
      $addFields: {
        dayKey: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TZ } }
      }
    },
    { $group: { _id: { dayKey: '$dayKey', kind: '$kind' }, amount: { $sum: '$amount' } } }
  ]);

  const map = new Map();
  for (const r of agg) {
    map.set(`${r._id.dayKey}:${r._id.kind}`, r.amount);
  }

  // Build the 7 day labels/keys in the same TZ as the aggregation.
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = fmtKey.format(d); // YYYY-MM-DD in en-CA
    const label = fmtDay.format(d); // Mon/Tue/...
    return { key, label };
  });

  return days.map(({ key, label }) => ({
    label,
    sales: map.get(`${key}:Sale`) || 0,
    purchase: map.get(`${key}:Purchase`) || 0
  }));
}

async function topSelling(userId){
  const uid = new mongoose.Types.ObjectId(userId);
  const rows = await Transaction.aggregate([
    { $match: { userId: uid, kind: 'Sale' } },
    { $group: { _id: '$productName', qty: { $sum: '$quantity' }, amount: { $sum: '$amount' } } },
    { $sort: { qty: -1 } },
    { $limit: 5 }
  ]);

  const names = rows.map(r=>r._id).filter(Boolean);
  const products = await Product.find({ userId, name: { $in: names } }).select('name imageUrl');
  const imgMap = new Map(products.map(p=>[p.name, p.imageUrl]));

  return rows.map(r=>({
    name: r._id,
    qty: r.qty,
    amount: r.amount,
    imageUrl: imgMap.get(r._id) || null
  }));
}

router.get('/dashboard', requireAuth, async (req,res)=>{
  try{
    const userId = req.user.id;
    const uid = new mongoose.Types.ObjectId(userId);

    // Amounts + quantities
    const [salesAgg, purchaseAgg] = await Promise.all([
      Transaction.aggregate([
        { $match: { userId: uid, kind:'Sale' } },
        { $group: { _id: null, amount: { $sum: '$amount' }, qty: { $sum: '$quantity' } } }
      ]),
      Transaction.aggregate([
        { $match: { userId: uid, kind:'Purchase' } },
        { $group: { _id: null, amount: { $sum: '$amount' }, qty: { $sum: '$quantity' } } }
      ])
    ]);

    const revenue = salesAgg[0]?.amount || 0;
    const salesQty = salesAgg[0]?.qty || 0;
    const purchaseCost = purchaseAgg[0]?.amount || 0;
    const purchaseQty = purchaseAgg[0]?.qty || 0;
    const profit = revenue - purchaseCost;

    const products = await Product.find({ userId });
    const totalProducts = products.length;
    const categories = new Set(products.map(p=>p.category)).size;
    const inStockItems = products.reduce((s,p)=>s + (p.quantity>0 ? p.quantity : 0), 0);
    const lowStockCount = products.filter(p=>p.status==='Low stock').length;
    const outOfStockCount = products.filter(p=>p.quantity<=0).length;

    const [monthlySeries, weeklySeries, top] = await Promise.all([
      getSalesPurchaseSeries(userId),
      getWeeklySalesPurchaseSeries(userId),
      topSelling(userId)
    ]);

    res.json({
      salesOverview: {
        salesQty,
        revenue,
        profit,
        cost: 17432 // hard-coded to match design
      },
      purchaseOverview: {
        purchaseQty,
        cost: purchaseCost,
        cancel: 5, // hard-coded to match design
        return: 17432 // hard-coded to match design
      },
      inventorySummary: {
        inStock: inStockItems,
        lowStock: lowStockCount,
        outOfStock: outOfStockCount,
        toBeReceived: 200 // hard-coded to match design
      },
      productSummary: {
        suppliers: 31, // hard-coded to match design
        categories,
        totalProducts
      },
      series: {
        monthly: monthlySeries,
        weekly: weeklySeries
      },
      topSelling: top
    });
  }catch(e){
    res.status(500).json({message:'Server error'});
  }
});

router.get('/statistics', requireAuth, async (req,res)=>{
  try{
    const userId = req.user.id;
    const uid = new mongoose.Types.ObjectId(userId);

    const revenueAgg = await Transaction.aggregate([
      { $match: { userId: uid, kind:'Sale' } },
      { $group: { _id: null, amount: { $sum: '$amount' }, sold: { $sum: '$quantity' } } }
    ]);
    const revenue = revenueAgg[0]?.amount || 0;
    const sold = revenueAgg[0]?.sold || 0;

    const products = await Product.find({ userId });
    const inStock = products.reduce((acc,p)=>acc + (p.quantity>0? p.quantity:0),0);

    const series = await getSalesPurchaseSeries(userId);
    const top = await topSelling(userId);

    const layout = await Layout.findOne({ userId });
    const cardOrder = layout?.statisticsCardOrder || ['revenue','sold','instock'];

    res.json({ cards: { revenue, sold, inStock }, series, topSelling: top, cardOrder });
  }catch(e){
    res.status(500).json({message:'Server error'});
  }
});

export default router;
