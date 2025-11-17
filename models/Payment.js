import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  paperId: { type: mongoose.Schema.Types.ObjectId, ref: 'Paper', required: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  method: { type: String, enum: ['Razorpay', 'PayPal', 'Bank Transfer'], required: true },
  transactionId: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Verified', 'Rejected', 'Completed'], default: 'Pending' }, // Added 'Rejected' status
  rejectionReason: { type: String }, // New field for rejection reason
  proofFile: { type: String },
}, { timestamps: true });

export default mongoose.model('Payment', paymentSchema);
