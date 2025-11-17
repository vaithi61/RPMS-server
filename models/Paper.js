import mongoose from 'mongoose';

const paperSchema = new mongoose.Schema({
  paperId: { type: String, unique: true },
  title: { type: String, required: true },
  abstract: { type: String },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  editor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { 
    type: String, 
    enum: [
      'Submitted', 
      'Editor Assigned', 
      'Editor Reassigned',
      'Under Review', 
      'Review Received',
      'Revision Required', 
      'Revised Submitted',
      'Conditionally Accept',
      'Accepted', 
      'Rejected', 
      'Awaiting Proof',
      'Proof Approved',
      'Published'
    ], 
    default: 'Submitted' 
  },
  filePath: { type: String },
  assignedReviewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  finalDecision: { type: String, enum: ['Accept', 'Conditionally Accept', 'Revise & Resubmit', 'Reject'] },
  finalFilePath: { type: String }, // New field for the final formatted file path
  versions: [{
    version: { type: Number, required: true },
    filePath: { type: String },
    submittedAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

export default mongoose.model('Paper', paperSchema);
