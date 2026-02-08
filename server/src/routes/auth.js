import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import OtpToken from '../models/OtpToken.js';
import { sendOtpEmail } from '../utils/mailer.js';

const router = express.Router();

const authLimiter = rateLimit({ windowMs: 60*1000, max: 20 });

function signToken(user){
  return jwt.sign({ sub: user._id.toString(), email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

router.post('/signup', authLimiter, async (req,res)=>{
  try{
    const { name, email, password } = req.body;
    if(!name || !email || !password) return res.status(400).json({message:'Missing fields'});
    const exists = await User.findOne({ email: email.toLowerCase() });
    if(exists) return res.status(409).json({message:'Email already in use'});
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email: email.toLowerCase(), passwordHash });
    const token = signToken(user);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  }catch(e){
    res.status(500).json({message:'Server error'});
  }
});

router.post('/login', authLimiter, async (req,res)=>{
  try{
    const { email, password } = req.body;
    if(!email || !password) return res.status(400).json({message:'Missing fields'});
    const user = await User.findOne({ email: email.toLowerCase() });
    if(!user) return res.status(401).json({message:'Invalid credentials'});
    const ok = await bcrypt.compare(password, user.passwordHash);
    if(!ok) return res.status(401).json({message:'Invalid credentials'});
    const token = signToken(user);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  }catch(e){
    res.status(500).json({message:'Server error'});
  }
});

router.post('/forgot-password', authLimiter, async (req,res)=>{
  try{
    const { email } = req.body;
    if(!email) return res.status(400).json({message:'Email required'});
    const safeEmail = email.toLowerCase();
    const user = await User.findOne({ email: safeEmail });
    if(!user){
      return res.status(404).json({ message: 'Email not found' });
    }

    const otp = String(Math.floor(100000 + Math.random()*900000));
    const expiresAt = new Date(Date.now() + 10*60*1000);

    await OtpToken.create({ userId: user._id, otp, expiresAt, used: false });

    // Send email in background; never block/throw.
    sendOtpEmail({ to: user.email, name: user.name, otp }).catch((err)=>{
      console.warn('[OTP] sendOtpEmail failed:', err?.message || err);
    });

    // For testing: return OTP so the frontend can print it in browser console.
    // (Do NOT do this in real production apps.)
    res.json({ ok: true, otp });
  }catch(e){
    res.status(500).json({message:'Server error'});
  }
});

router.post('/verify-otp', authLimiter, async (req,res)=>{
  try{
    const { email, otp } = req.body;
    if(!email || !otp) return res.status(400).json({message:'Missing fields'});
    const user = await User.findOne({ email: email.toLowerCase() });
    if(!user) return res.status(400).json({message:'Invalid OTP'});
    const token = await OtpToken.findOne({ userId: user._id, otp, used: false }).sort({ createdAt: -1 });
    if(!token) return res.status(400).json({message:'Invalid OTP'});
    if(token.expiresAt.getTime() < Date.now()) return res.status(400).json({message:'OTP expired'});
    token.used = true;
    await token.save();
    res.json({ ok: true });
  }catch(e){
    res.status(500).json({message:'Server error'});
  }
});

router.post('/reset-password', authLimiter, async (req,res)=>{
  try{
    const { email, newPassword } = req.body;
    if(!email || !newPassword) return res.status(400).json({message:'Missing fields'});
    const user = await User.findOne({ email: email.toLowerCase() });
    if(!user) return res.status(400).json({message:'Invalid request'});
    // Require that a recent OTP was used
    const recent = await OtpToken.findOne({ userId: user._id, used: true }).sort({ updatedAt: -1 });
    if(!recent || (Date.now() - recent.updatedAt.getTime()) > 15*60*1000){
      return res.status(400).json({message:'OTP verification required'});
    }
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ ok: true });
  }catch(e){
    res.status(500).json({message:'Server error'});
  }
});

export default router;
