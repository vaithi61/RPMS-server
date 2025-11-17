import mongoose from 'mongoose';

const productionSchema = new mongoose.Schema({
  paperId: { type: mongoose.Schema.Types.ObjectId, ref: 'Paper', required: true },
  finalFilePath: { type: String },
  publicationDate: { type: Date },
  status: { type: String, enum: ['Awaiting Proof', 'Proof Approved', 'Published'], default: 'Awaiting Proof' },
}, { timestamps: true });

export default mongoose.model('Production', productionSchema);
