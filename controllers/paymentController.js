import mongoose from 'mongoose';
import Payment from '../models/Payment.js';
import Paper from '../models/Paper.js';
import { sendEmail } from '../services/emailService.js';

// Submit payment proof
export const submitPayment = async (req, res) => {
  try {
    console.log('=== PAYMENT SUBMISSION DEBUG ===');
    console.log('req.body:', req.body);
    console.log('req.file:', req.file);
    console.log('req.user:', req.user);

    const { paperId, method, transactionId } = req.body;
    const amount = parseFloat(req.body.amount);

    if (!req.file) {
      return res.status(400).json({ message: 'Payment proof file is required' });
    }

    // paperId from frontend is actually the MongoDB _id
    const paper = await Paper.findById(paperId);
    if (!paper) {
      return res.status(404).json({ message: 'Paper not found' });
    }

    // Use secure_url from Cloudinary, fallback to path
    const proofFileUrl = req.file.secure_url || req.file.path;
    console.log('Proof file URL:', proofFileUrl);

    if (!proofFileUrl) {
      return res.status(500).json({ message: 'File upload failed - no URL generated' });
    }

    console.log('Creating new Payment document...');
    const payment = new Payment({
      paperId: paper._id,
      authorId: req.user._id,
      amount,
      method,
      transactionId,
      proofFile: proofFileUrl,
    });
    console.log('Payment document created:', payment);
    await payment.save();
    console.log('Payment document saved successfully');

    res.status(201).json({ message: 'Payment submitted successfully', payment });
  } catch (error) {
    console.error('Payment submission error:', error);
    res.status(500).json({ message: 'Error submitting payment', error: error.message });
  }
};

// Update payment status (Verify/Reject)
export const updatePaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { status, reason } = req.body;

    const payment = await Payment.findById(paymentId).populate({
      path: 'paperId',
      populate: { path: 'author' }
    });
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    payment.status = status;
    if (status === 'Rejected') {
      payment.rejectionReason = reason;
    } else {
      payment.rejectionReason = undefined;
    }
    await payment.save();

    // Update paper status if payment is verified
    if (status === 'Verified') {
      const paper = await Paper.findById(payment.paperId._id);
      if (paper) {
        paper.status = 'Proof Approved';
        await paper.save();
      }
      // Notify author of verification
      sendEmail({ to: payment.paperId.author.email, subject: 'Payment Verified', html: `Your payment for paper ${payment.paperId.paperId} has been verified. The paper is now proceeding to the production stage.` });
    } else if (status === 'Rejected') {
      // Notify author of rejection
      sendEmail({ to: payment.paperId.author.email, subject: 'Payment Rejected', html: `Your payment proof for paper ${payment.paperId.paperId} was rejected. Reason: ${reason || 'No reason provided'}. Please upload a valid proof again.` });
    }

    res.status(200).json({ message: `Payment status updated to ${status} successfully` });
  } catch (error) {
    res.status(500).json({ message: 'Error updating payment status', error: error.message });
  }
};

// List all payments for admin
export const listAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find({})
      .populate({
        path: 'paperId',
        select: 'paperId title',
      })
      .populate({
        path: 'authorId',
        select: 'email name',
      })
      .sort({ createdAt: -1 });

    res.status(200).json(payments);
  } catch (error) {
    res.status(500).json({ message: 'Error listing payments', error: error.message });
  }
};

// List payments for the current author
export const listPaymentsByAuthor = async (req, res) => {
  try {
    const authorId = req.user._id;
    const payments = await Payment.find({ authorId })
      .populate({
        path: 'paperId',
        select: 'paperId title status',
      })
      .sort({ createdAt: -1 });

    res.status(200).json(payments);
  } catch (error) {
    res.status(500).json({ message: 'Error listing author payments', error: error.message });
  }
};
