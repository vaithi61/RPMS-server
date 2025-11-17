import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  paper: { type: mongoose.Schema.Types.ObjectId, ref: 'Paper', required: true },
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ratings: {
    technicalQuality: { type: String, enum: ['Excellent', 'Good', 'Fair', 'Poor'] },
    significance: { type: String, enum: ['Excellent', 'Good', 'Fair', 'Poor'] },
    presentation: { type: String, enum: ['Excellent', 'Good', 'Fair', 'Poor'] },
    relevance: { type: String, enum: ['Excellent', 'Good', 'Fair', 'Poor'] },
    originality: { type: String, enum: ['Excellent', 'Good', 'Fair', 'Poor'] },
    adequacyOfCitations: { type: String, enum: ['Excellent', 'Good', 'Fair', 'Poor'] },
    overall: { type: String, enum: ['Excellent', 'Good', 'Fair', 'Poor'] },
    otherFactors: { type: String },
  },
  additionalQuestions: {
    suggestOwnReferences: { type: Boolean },
    recommendForBestPaperAward: { type: Boolean },
    suggestAnotherJournal: { type: Boolean },
    willingToReviewRevisions: { type: Boolean },
  },
  recommendation: { 
    type: String, 
    enum: ['Accept', 'Conditionally Accept', 'Revise & Resubmit', 'Reject'], 
    required: true 
  },
  confidentialCommentsToEditor: { type: String },
  commentsToAuthor: { type: String },
  reviewUploads: [{ type: String }], // Array of file paths
}, { timestamps: true });

export default mongoose.model('Review', reviewSchema);
