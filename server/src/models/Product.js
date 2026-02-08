import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
    imageUrl: { type: String, default: '' },
    name: { type: String, required: true, trim: true },
    // Human-friendly product id.
    // UI keeps this read-only; if not provided we auto-generate it server-side.
    productId: { type: String, trim: true },
    category: { type: String, required: true, trim: true },
    salesPrice: { type: Number, required: true },
    purchasePrice: { type: Number, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, required: true, trim: true },
    expiryDate: { type: Date },
    threshold: { type: Number, required: true },
    status: { type: String, enum: ['In stock', 'Low stock', 'Out of stock'], default: 'In stock' }
  },
  { timestamps: true }
);

productSchema.index({ userId: 1, productId: 1 }, { unique: true });

productSchema.pre('validate', function(next){
  if(!this.productId){
    // Compact, unique-enough id for UI display. Example: PRD-kr8x9q-7F2A
    const ts = Date.now().toString(36);
    const rnd = Math.random().toString(36).slice(2,6).toUpperCase();
    this.productId = `PRD-${ts}-${rnd}`;
  }
  next();
});

export default mongoose.model('Product', productSchema);
