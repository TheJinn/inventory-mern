import Product from '../models/Product.js';

export function computeStatus(quantity, threshold){
  if(quantity <= 0) return 'Out of stock';
  if(quantity <= threshold) return 'Low stock';
  return 'In stock';
}

export async function refreshUserStockStatuses(userId){
  const products = await Product.find({ userId });
  const updates = products.map(p=>{
    const status = computeStatus(p.quantity, p.threshold);
    if(status !== p.status){
      p.status = status;
      return p.save();
    }
    return null;
  }).filter(Boolean);
  await Promise.all(updates);
}
