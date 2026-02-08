import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
  seq: { type: Number, default: 0 }
});

export default mongoose.model('InvoiceCounter', counterSchema);
