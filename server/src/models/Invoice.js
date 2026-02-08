import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
    invoiceId: { type: String, required: true },
    referenceNumber: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['Paid','Unpaid'], default: 'Unpaid' },
    dueDate: { type: Date, required: true },
    items: [
      {
        productName: String,
        quantity: Number,
        unitPrice: Number,
        lineTotal: Number
      }
    ],
    customerName: { type: String, default: 'Customer' }
  },
  { timestamps: true }
);

invoiceSchema.index({ userId: 1, invoiceId: 1 }, { unique: true });

export default mongoose.model('Invoice', invoiceSchema);
