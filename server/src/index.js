import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';

import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import invoiceRoutes from './routes/invoices.js';
import statsRoutes from './routes/stats.js';
import settingsRoutes from './routes/settings.js';
import Product from './models/Product.js';
import { computeStatus } from './utils/stock.js';

// Load env from both `server/.env` and project-root `.env` (helps when running from different CWDs)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();

app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.use(cors());

// No local image storage; images are stored in Cloudinary only.

app.get('/api/health', (_req,res)=>res.json({ ok:true }));
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/settings', settingsRoutes);

// Cron job: run every hour to update status for all products
cron.schedule('0 * * * *', async ()=>{
  try{
    const products = await Product.find({});
    for (const p of products){
      const status = computeStatus(p.quantity, p.threshold);
      if(status !== p.status){
        p.status = status;
        await p.save();
      }
    }
    console.log('Cron: stock statuses refreshed');
  }catch(e){
    console.error('Cron error', e);
  }
});

const port = Number(process.env.PORT || 5000);
const mongo = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/inventory_mern';

connectDB(mongo)
  .then(()=>{
    app.listen(port, ()=>console.log(`Server listening on :${port}`));
  })
  .catch((e)=>{
    console.error('DB connection failed', e);
    process.exit(1);
  });
