import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import Token from '../models/Token.js';
import { sendEmail, templates } from '../services/emailService.js';

const SALT_ROUNDS = 12;

function signAccess(user) {
  return jwt.sign({ id: user._id, role: user.role, email: user.email }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
}
function signRefresh(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

export async function register(req, res, next) {
  try {
    const { email, password, role, adminSecret, name } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email already registered' });
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    let finalRole = 'Author'; // Default role
    if (['Reviewer', 'Editor', 'Production Editor'].includes(role)) {
      finalRole = role;
    } else if (role === 'Admin') {
      if (!adminSecret || adminSecret !== process.env.ADMIN_REG_SECRET) {
        return res.status(403).json({ message: 'Invalid admin registration secret' });
      }
      finalRole = 'Admin';
    }
    const user = await User.create({ email, passwordHash, role: finalRole, name });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await Token.create({ userId: user._id, token, type: 'verification', expiresAt });

    const link = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    try {
      await sendEmail({ to: user.email, subject: 'Verify your email', html: templates.verification(link) });
      return res.status(201).json({ message: 'Registered successfully. Please verify your email.' });
    } catch (emailError) {
      console.error('Error sending verification email during registration:', emailError);
      // Optionally, delete the user if email sending is critical for registration
      // await User.findByIdAndDelete(user._id);
      // await Token.deleteOne({ userId: user._id, type: 'verification' });
      return res.status(500).json({ message: 'Registration failed due to email service error.' });
    }
  } catch (err) { next(err); }
}

export async function verifyEmail(req, res, next) {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ message: 'Token missing' });
    const record = await Token.findOne({ token, type: 'verification', expiresAt: { $gt: new Date() } });
    if (!record) return res.status(400).json({ message: 'Invalid or expired token' });

    await User.updateOne({ _id: record.userId }, { $set: { isVerified: true } });
    await Token.deleteOne({ _id: record._id });

    return res.json({ message: 'Email verified. You can now log in.' });
  } catch (err) { next(err); }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
    if (!user.isVerified) return res.status(403).json({ message: 'Please verify your email before login' });
    const accessToken = signAccess(user);
    const refreshToken = signRefresh(user);
    return res.json({ accessToken, refreshToken, user: { id: user._id, email: user.email, role: user.role } });
  } catch (err) { next(err); }
}

export async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: 'refreshToken required' });
    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (e) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ message: 'Invalid refresh token' });
    const accessToken = signAccess(user);
    return res.json({ accessToken });
  } catch (err) { next(err); }
}

export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await Token.create({ userId: user._id, token, type: 'reset', expiresAt });
      const link = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
      await sendEmail({ to: user.email, subject: 'Password reset', html: templates.reset(link) });
    }
    return res.json({ message: 'If the email exists, a reset link has been sent.' });
  } catch (err) { next(err); }
}

export async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: 'Token and password required' });
    const record = await Token.findOne({ token, type: 'reset', expiresAt: { $gt: new Date() } });
    if (!record) return res.status(400).json({ message: 'Invalid or expired token' });
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await User.updateOne({ _id: record.userId }, { $set: { passwordHash } });
    await Token.deleteOne({ _id: record._id });
    return res.json({ message: 'Password updated successfully' });
  } catch (err) { next(err); }
}

export async function resendVerification(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ message: 'User already verified' });

    // Invalidate previous verification tokens
    await Token.deleteMany({ userId: user._id, type: 'verification' });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await Token.create({ userId: user._id, token, type: 'verification', expiresAt });

    const link = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    await sendEmail({ to: user.email, subject: 'Verify your email', html: templates.verification(link) });
    return res.json({ message: 'Verification email sent' });
  } catch (err) { next(err); }
}
