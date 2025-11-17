import Paper from '../models/Paper.js';
import User from '../models/User.js';
import { sendEmail } from '../services/emailService.js';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose'; // Import mongoose for ObjectId

// Search for reviewers
export const searchReviewers = async (req, res) => {
  try {
    const { q } = req.query;
    const query = { role: 'Reviewer' };
    if (q) {
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ];
    }
    const reviewers = await User.find(query).select('name email role');
    res.status(200).json({ reviewers });
  } catch (error) {
    res.status(500).json({ message: 'Error searching reviewers', error: error.message });
  }
};

// Assign reviewers to a paper
export const assignReviewers = async (req, res) => {
  try {
    const { paperId, reviewerIds } = req.body;
    const paper = await Paper.findById(paperId).populate('author');
    if (!paper) {
      return res.status(404).json({ message: 'Paper not found' });
    }

    // Ensure reviewerIds are valid ObjectIds
    const validReviewerObjectIds = reviewerIds.map(id => new mongoose.Types.ObjectId(id));
    paper.assignedReviewers = validReviewerObjectIds;
    paper.status = 'Under Review';
    await paper.save();

    // Notify reviewers, author, and admin
    const reviewers = await User.find({ _id: { $in: validReviewerObjectIds } });
    reviewers.forEach(reviewer => {
      sendEmail({ to: reviewer.email, subject: 'New Paper Assignment', html: `You have been assigned to review paper ${paper.paperId}.` });
    });
    sendEmail({ to: paper.author.email, subject: 'Paper Under Review', html: `Your paper ${paper.paperId} is now under review.` });
    // Assuming an admin email is configured
    // sendEmail({ to: adminEmail, subject: 'Paper Under Review', html: `Paper ${paper.paperId} is now under review.` });

    res.status(200).json({ message: 'Reviewers assigned successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error assigning reviewers', error: error.message });
  }
};

export const addNewReviewer = async (req, res) => {
  try {
    const { name, email } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const tempPassword = crypto.randomBytes(8).toString('hex');
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const newUser = new User({
      name,
      email,
      passwordHash,
      role: 'Reviewer',
      isVerified: true, // Or send a verification email
    });
    await newUser.save();

    // Send credentials to the new reviewer
    await sendEmail({ to: email, subject: 'Your New Reviewer Account', html: `Welcome! Your account has been created. Your temporary password is: ${tempPassword}` });

    res.status(201).json({ message: 'Reviewer account created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error creating reviewer account', error: error.message });
  }
};

// Make a final decision on a paper
export const makeFinalDecision = async (req, res) => {
  try {
    const { paperId, decision } = req.body;
    const paper = await Paper.findById(paperId).populate('author');
    if (!paper) {
      return res.status(404).json({ message: 'Paper not found' });
    }

    paper.finalDecision = decision;
    paper.status = decision === 'Accept' ? 'Accepted' : (decision === 'Reject' ? 'Rejected' : 'Revision Required');
    await paper.save();

    // Notify author and reviewers
    sendEmail(paper.author.email, `Decision on Paper ${paper.paperId}`, `The final decision on your paper is: ${decision}.`);
    const reviewers = await User.find({ _id: { $in: paper.assignedReviewers } });
    reviewers.forEach(reviewer => {
      sendEmail(reviewer.email, `Decision on Paper ${paper.paperId}`, `The final decision on paper ${paper.paperId} has been made.`);
    });

    res.status(200).json({ message: 'Final decision recorded successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error making final decision', error: error.message });
  }
};
