import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['Author', 'Reviewer', 'Admin', 'Editor', 'Production Editor'], default: 'Author' },
  isVerified: { type: Boolean, default: false },
  name: { type: String, trim: true },
}, { timestamps: true });

export default mongoose.model('User', userSchema);
