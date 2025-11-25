import mongoose from 'mongoose'; // Import mongoose
import Payment from '../models/Payment.js';
import Paper from '../models/Paper.js';
import { sendEmail } from '../services/emailService.js';

// Submit payment proof
export const submitPayment = async (req, res) => {
  try {
    console.log('req.body:', req.body);
    console.log('req.file:', req.file);
    console.log('req.user:', req.user); // Log req.user

    const { paperId, method, transactionId } = req.body;
    const amount = parseFloat(req.body.amount); // Explicitly convert amount to a number

    const paper = await Paper.findOne({ paperId: paperId }); // Find paper by its custom paperId string
    if (!paper) {
      return res.status(404).json({ message: 'Paper not found' });
    }

    console.log('Creating new Payment document...');
    const payment = new Payment({
      paperId: paper._id, // Use the MongoDB _id of the found paper
      authorId: req.user._id,
      amount,
      method,
      transactionId,
      proofFile: req.file.secure_url, // Store Cloudinary URL
    });
    console.log('Payment document created:', payment);
    await payment.save();
    console.log('Payment document saved.');

    // Notify admin
    // sendEmail(adminEmail, 'Payment Proof Submitted', `Payment proof has been submitted for paper ${paper.paperId}.`);

    res.status(201).json({ message: 'Payment submitted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error submitting payment', error: error.message });
  }
};

// Update payment status (Verify/Reject)
export const updatePaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { status, reason } = req.body; // 'Verified' or 'Rejected', and reason for rejection

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
      payment.rejectionReason = undefined; // Clear reason if not rejected
    }
    await payment.save();

    // Update paper status if payment is verified
    if (status === 'Verified') {
      const paper = await Paper.findById(payment.paperId._id);
      if (paper) {
        paper.status = 'Awaiting Proof'; // Or 'Production Ready' depending on workflow
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
        select: 'paperId title', // Select specific fields from Paper
      })
      .populate({
        path: 'authorId',
        select: 'email name', // Select specific fields from User
      })
      .sort({ createdAt: -1 }); // Sort by most recent

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
        select: 'paperId title status', // Select specific fields from Paper
      })
      .sort({ createdAt: -1 }); // Sort by most recent

    res.status(200).json(payments);
  } catch (error) {
    res.status(500).json({ message: 'Error listing author payments', error: error.message });
  }
};
