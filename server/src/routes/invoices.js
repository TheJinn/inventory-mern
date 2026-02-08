import express from 'express';
import Invoice from '../models/Invoice.js';
import Transaction from '../models/Transaction.js';
import { requireAuth } from '../middleware/auth.js';
import mongoose from 'mongoose';

const router = express.Router();

router.get('/', requireAuth, async (req,res)=>{
  try{
    const userId = req.user.id;
    const page = Math.max(1, Number(req.query.page||1));
    const limit = Math.min(50, Math.max(5, Number(req.query.limit||10)));
    const search = String(req.query.search || '').trim();

    const filter = { userId };
    if (search) {
      // Escape special regex chars so users can search for INV-0001 etc safely.
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rx = new RegExp(escaped, 'i');
      filter.$or = [
        { invoiceId: { $regex: rx } },
        { referenceNumber: { $regex: rx } }
      ];
    }

    const total = await Invoice.countDocuments(filter);
    const items = await Invoice.find(filter)
      .sort({ createdAt: -1 })
      .skip((page-1)*limit)
      .limit(limit);
    res.json({ items, total, page, limit });
  }catch(e){
    res.status(500).json({message:'Server error'});
  }
});

router.get('/summary', requireAuth, async (req,res)=>{
  try{
    const userId = req.user.id;
    const now = Date.now();
    const last7 = new Date(now - 7*24*60*60*1000);

    const totalInvoices = await Invoice.countDocuments({ userId });
    const invoicesLast7 = await Invoice.countDocuments({ userId, createdAt: { $gte: last7 } });

    const uid = new mongoose.Types.ObjectId(userId);
    // Paid card in design is based on last 7 days.
    const paidLast7 = await Invoice.aggregate([
      { $match: { userId: uid, status: 'Paid', createdAt: { $gte: last7 } } },
      { $group: { _id: '$status', amount: { $sum: '$amount' }, customers: { $addToSet: '$customerName' }, count: { $sum: 1 } } }
    ]);
    // Unpaid card is total pending (all time)
    const unpaidAll = await Invoice.aggregate([
      { $match: { userId: uid, status: 'Unpaid' } },
      { $group: { _id: '$status', amount: { $sum: '$amount' }, customers: { $addToSet: '$customerName' }, count: { $sum: 1 } } }
    ]);

    const paidAmount = paidLast7[0]?.amount || 0;
    const paidCustomers = paidLast7[0]?.customers?.length || 0;
    const unpaidAmount = unpaidAll[0]?.amount || 0;
    const unpaidCustomers = unpaidAll[0]?.customers?.length || 0;

    const processedInvoices = await Invoice.countDocuments({ userId, status: 'Paid' });
    const recentTransactionsCount = await Transaction.countDocuments({ userId, createdAt: { $gte: last7 } });

    const recentTransactions = await Transaction.find({ userId }).sort({ createdAt: -1 }).limit(5);
    const recentInvoices = await Invoice.find({ userId }).sort({ createdAt: -1 }).limit(5);

    res.json({
      cards: {
        recentTransactionsCount,
        totalInvoices,
        processedInvoices,
        paidAmount,
        paidCustomers,
        unpaidAmount,
        unpaidCustomers
      },
      recentTransactions,
      recentInvoices
    });
  }catch(e){
    res.status(500).json({message:'Server error'});
  }
});

router.patch('/:id/status', requireAuth, async (req,res)=>{
  try{
    const userId = req.user.id;
    const { status } = req.body;
    if(!['Paid','Unpaid'].includes(status)) return res.status(400).json({message:'Invalid status'});
    const inv = await Invoice.findOneAndUpdate({ _id: req.params.id, userId }, { status }, { new: true });
    if(!inv) return res.status(404).json({message:'Invoice not found'});
    res.json({ invoice: inv });
  }catch(e){
    res.status(500).json({message:'Server error'});
  }
});

router.get('/:id', requireAuth, async (req,res)=>{
  try{
    const userId = req.user.id;
    const inv = await Invoice.findOne({ _id: req.params.id, userId });
    if(!inv) return res.status(404).json({message:'Invoice not found'});
    res.json({ invoice: inv });
  }catch(e){
    res.status(500).json({message:'Server error'});
  }
});

router.delete('/:id', requireAuth, async (req,res)=>{
  try{
    const userId = req.user.id;
    const inv = await Invoice.findOneAndDelete({ _id: req.params.id, userId });
    if(!inv) return res.status(404).json({message:'Invoice not found'});
    res.json({ ok: true });
  }catch(e){
    res.status(500).json({message:'Server error'});
  }
});

export default router;
