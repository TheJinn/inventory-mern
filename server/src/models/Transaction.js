import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
    kind: { type: String, enum: ['Purchase', 'Sale'], required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    productName: { type: String, required: true },
    amount: { type: Number, required: true },
    quantity: { type: Number, required: true }
  },
  { timestamps: true }
);

export default mongoose.model('Transaction', transactionSchema);
