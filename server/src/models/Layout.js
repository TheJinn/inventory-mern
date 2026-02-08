import mongoose from 'mongoose';

const layoutSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
    statisticsCardOrder: { type: [String], default: ['revenue','sold','instock'] }
  },
  { timestamps: true }
);

export default mongoose.model('Layout', layoutSchema);
