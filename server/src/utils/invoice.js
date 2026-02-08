import InvoiceCounter from '../models/InvoiceCounter.js';

export async function nextInvoiceId(userId){
  const doc = await InvoiceCounter.findOneAndUpdate(
    { userId },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const n = doc.seq;
  return `INV-${String(n).padStart(5,'0')}`;
}

export function makeReference(){
  const rand = Math.random().toString(36).slice(2,8).toUpperCase();
  const t = Date.now().toString().slice(-6);
  return `REF-${rand}-${t}`;
}
