import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Layout from '../models/Layout.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/me', requireAuth, async (req,res)=>{
  try{
    const user = await User.findById(req.user.id).select('_id name email');
    res.json({ user });
  }catch(e){
    res.status(500).json({message:'Server error'});
  }
});

router.patch('/profile', requireAuth, async (req,res)=>{
  try{
    const { name } = req.body;
    if(!name) return res.status(400).json({message:'Name required'});
    const user = await User.findByIdAndUpdate(req.user.id, { name }, { new: true }).select('_id name email');
    res.json({ user });
  }catch(e){
    res.status(500).json({message:'Server error'});
  }
});

router.patch('/password', requireAuth, async (req,res)=>{
  try{
    const { currentPassword, newPassword } = req.body;
    if(!newPassword) return res.status(400).json({message:'Missing newPassword'});
    const user = await User.findById(req.user.id);

    // If currentPassword is provided, verify it.
    // If it's omitted, treat this as a "reset" from Settings (per UI requirement).
    if(currentPassword){
      const ok = await bcrypt.compare(currentPassword, user.passwordHash);
      if(!ok) return res.status(400).json({message:'Current password incorrect'});
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ ok: true });
  }catch(e){
    res.status(500).json({message:'Server error'});
  }
});

router.get('/layout', requireAuth, async (req,res)=>{
  try{
    const layout = await Layout.findOne({ userId: req.user.id });
    res.json({ cardOrder: layout?.statisticsCardOrder || ['revenue','sold','instock'] });
  }catch(e){
    res.status(500).json({message:'Server error'});
  }
});

router.put('/layout', requireAuth, async (req,res)=>{
  try{
    const { cardOrder } = req.body;
    if(!Array.isArray(cardOrder) || cardOrder.length!==3) return res.status(400).json({message:'Invalid order'});
    const allowed = new Set(['revenue','sold','instock']);
    if(cardOrder.some(x=>!allowed.has(x))) return res.status(400).json({message:'Invalid order'});
    const layout = await Layout.findOneAndUpdate(
      { userId: req.user.id },
      { statisticsCardOrder: cardOrder },
      { new: true, upsert: true }
    );
    res.json({ cardOrder: layout.statisticsCardOrder });
  }catch(e){
    res.status(500).json({message:'Server error'});
  }
});

export default router;
