import express from 'express';
import multer from 'multer';
import { parse } from 'csv-parse';
import path from 'path';
import Product from '../models/Product.js';
import Transaction from '../models/Transaction.js';
import Invoice from '../models/Invoice.js';
import { requireAuth } from '../middleware/auth.js';
import { refreshUserStockStatuses, computeStatus } from '../utils/stock.js';
import { nextInvoiceId, makeReference } from '../utils/invoice.js';
import { getCloudinary, isCloudinaryConfigured } from '../config/cloudinary.js';
import { Readable } from 'stream';

const router = express.Router();

// NOTE: We do NOT store images locally. Images are uploaded to Cloudinary only.
// CSV is processed in-memory as well (no temp files).
const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5*1024*1024 } });
const imageUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5*1024*1024 } });

function safeBaseName(originalName='image'){
  const ext = path.extname(originalName||'') || '.png';
  const base = path.basename(originalName||'file', ext).replace(/[^a-z0-9_-]/ig,'');
  return { base: base || 'image', ext };
}

async function uploadToCloudinary(buffer, originalName){
  if(!isCloudinaryConfigured()){
    const err = new Error('Cloudinary is not configured');
    err.statusCode = 500;
    throw err;
  }
  // Configure lazily (dotenv in index.js runs after ESM imports)
  const cloudinary = getCloudinary();
  return await new Promise((resolve, reject)=>{
    const { base } = safeBaseName(originalName);
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'inventory_products', public_id: `${Date.now()}-${base}`, resource_type: 'image' },
      (err, result)=>{
        if(err) reject(err);
        else resolve(result);
      }
    );
    // IMPORTANT: Readable.from(Buffer) iterates byte-by-byte.
    // Use stream.end(buffer) so Cloudinary receives the full payload reliably.
    stream.end(buffer);
  });
}

function toNum(v){
  if (v === undefined || v === null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v).trim();
  if (!s) return null;
  // Remove currency symbols, commas, and other non-numeric chars (keep dot and minus)
  const cleaned = s.replace(/[^0-9.\-]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

router.post('/create', requireAuth, imageUpload.single('image'), async (req,res)=>{
  try{
    const userId = req.user.id;
    const { name, category, price, quantity, unit, expiryDate, threshold } = req.body;
    const salesPrice = toNum(price);
    const qty = toNum(quantity);
    const thr = toNum(threshold);
    if(!name || !category || salesPrice===null || qty===null || !unit || thr===null){
      return res.status(400).json({message:'Missing required fields'});
    }
    const purchasePrice = Math.round((salesPrice * 0.9)*100)/100;
    const status = computeStatus(qty, thr);
    let imageUrl = '';
    if(req.file?.buffer){
      const uploaded = await uploadToCloudinary(req.file.buffer, req.file.originalname);
      if(!uploaded?.secure_url){
        return res.status(500).json({ message: 'Image upload failed' });
      }
      imageUrl = uploaded.secure_url;
    }

    const product = await Product.create({
      userId,
      imageUrl,
      name,
      category,
      salesPrice,
      purchasePrice,
      quantity: qty,
      unit,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      threshold: thr,
      status
    });

    // Create PURCHASE transaction so dashboard purchase totals update immediately
    const purchaseAmount = purchasePrice * qty;
    await Transaction.create({
      userId,
      kind: 'Purchase',
      product: product._id,
      productName: product.name,
      amount: purchaseAmount,
      quantity: qty
    });

    await refreshUserStockStatuses(userId);

    res.json({ product });
  }catch(e){
    if(e?.statusCode){
      return res.status(e.statusCode).json({ message: e.message || 'Upload error' });
    }
    if(e && e.code === 11000) return res.status(409).json({message:'Product ID already exists'});
    res.status(500).json({message:'Server error'});
  }
});

// Helpful message if something in the UI/browser accidentally hits this endpoint via GET
router.get('/create', (_req, res) => {
  res.status(405).json({ message: 'Use POST /api/products/create' });
});

router.get('/', requireAuth, async (req,res)=>{
  try{
    const userId = req.user.id;
    const page = Math.max(1, Number(req.query.page||1));
    const limit = Math.min(50, Math.max(5, Number(req.query.limit||10)));
    const q = String(req.query.q||'').trim();

    const filter = { userId };
    if(q){
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { productId: { $regex: q, $options: 'i' } }
      ];
    }

    const total = await Product.countDocuments(filter);
    const items = await Product.find(filter)
      .sort({ createdAt: -1 })
      .skip((page-1)*limit)
      .limit(limit);

    res.json({ items, total, page, limit });
  }catch(e){
    res.status(500).json({message:'Server error'});
  }
});

router.post('/upload-csv', requireAuth, csvUpload.single('file'), async (req,res)=>{
  try{
    if(!req.file) return res.status(400).json({message:'CSV file required'});
    const userId = req.user.id;
    const rows = [];
    const rejected = [];

    // IMPORTANT: Readable.from(Buffer) iterates byte-by-byte, which can cause csv-parse
    // to stop early on some environments. Wrap buffer in an array so it's streamed as one chunk.
    const parser = Readable.from([req.file.buffer])
      .pipe(parse({ columns: true, skip_empty_lines: true, trim: true, bom: true, relax_column_count: true }));

    for await (const record of parser){
      rows.push(record);
    }

    const created = [];

    // Helper: find a value by trying multiple possible header names (case/space-insensitive)
    function pick(r, keys){
      const entries = Object.entries(r || {});
      const norm = new Map(entries.map(([k,v]) => [String(k).toLowerCase().replace(/\s|_|-|\./g,''), v]));
      for (const k of keys){
        const nk = String(k).toLowerCase().replace(/\s|_|-|\./g,'');
        if (norm.has(nk)) return norm.get(nk);
      }
      return undefined;
    }
    for (let i=0;i<rows.length;i++){
      const r = rows[i];
      const name = pick(r, ['Product Name','productName','name']);
      const productId = pick(r, ['Product ID','productId','id','sku']);
      const category = pick(r, ['Category','category']);
      const price = toNum(pick(r, ['Price','Sales Price','salesPrice','salePrice','mrp']));
      const quantity = toNum(pick(r, ['Quantity','qty','stock','available']));
      const unit = pick(r, ['Unit','unit']);
      const expiryDate = pick(r, ['Expiry Date','expiryDate','expiry','exp']);
      const threshold = toNum(pick(r, ['Threshold Value','threshold','thresholdValue','minStock','minimumStock']));

      const errors = [];
      if(!name) errors.push('Missing Product Name');
      // Product ID is optional (auto-generated if blank)
      if(!category) errors.push('Missing Category');
      if(price===null) errors.push('Invalid Price');
      if(quantity===null) errors.push('Invalid Quantity');
      if(!unit) errors.push('Missing Unit');
      if(threshold===null) errors.push('Invalid Threshold');

      if(errors.length){
        rejected.push({ row: i+2, productId: productId||'', errors });
        continue;
      }

      try{
        const salesPrice = price;
        const purchasePrice = Math.round((salesPrice*0.9)*100)/100;
        const status = computeStatus(quantity, threshold);
        const product = await Product.create({
          userId,
          imageUrl: '',
          name,
          productId: productId || undefined,
          category,
          salesPrice,
          purchasePrice,
          quantity,
          unit,
          expiryDate: expiryDate ? new Date(expiryDate) : undefined,
          threshold,
          status
        });

        await Transaction.create({
          userId,
          kind: 'Purchase',
          product: product._id,
          productName: product.name,
          amount: purchasePrice * quantity,
          quantity
        });

        created.push(product);
      }catch(err){
        rejected.push({ row: i+2, productId, errors: ['Duplicate Product ID or invalid data'] });
      }
    }

    await refreshUserStockStatuses(userId);
    res.json({ createdCount: created.length, rejected });
  }catch(e){
    res.status(500).json({message:'Server error'});
  }
});

async function handleBuy(req,res){
  try{
    const userId = req.user.id;
    const qtyRaw = req.body?.qty ?? req.body?.quantity ?? req.query?.qty;
    const buyQty = toNum(qtyRaw);
    if(buyQty===null || buyQty<=0) return res.status(400).json({message:'Invalid quantity'});

    const product = await Product.findOne({ _id: req.params.id, userId });
    if(!product) return res.status(404).json({message:'Product not found'});
    if(product.quantity < buyQty) return res.status(400).json({message:'Not enough stock'});

    product.quantity -= buyQty;
    product.status = computeStatus(product.quantity, product.threshold);
    await product.save();

    const saleAmount = product.salesPrice * buyQty;
    await Transaction.create({
      userId,
      kind: 'Sale',
      product: product._id,
      productName: product.name,
      amount: saleAmount,
      quantity: buyQty
    });

    // create invoice for sale
    const invoiceId = await nextInvoiceId(userId);
    const invoice = await Invoice.create({
      userId,
      invoiceId,
      referenceNumber: makeReference(),
      amount: saleAmount,
      status: 'Unpaid',
      dueDate: new Date(Date.now() + 7*24*60*60*1000),
      items: [{ productName: product.name, quantity: buyQty, unitPrice: product.salesPrice, lineTotal: saleAmount }],
      customerName: 'Customer'
    });

    await refreshUserStockStatuses(userId);

    res.json({ ok: true, product, invoice });
  }catch(e){
    res.status(500).json({message:'Server error'});
  }
}

// Accept POST (preferred) and GET (fallback) to avoid "Cannot GET" issues from older UI interactions
router.post('/buy/:id', requireAuth, handleBuy);
router.get('/buy/:id', requireAuth, handleBuy);

export default router;
