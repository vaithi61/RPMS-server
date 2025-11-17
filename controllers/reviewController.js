import mongoose from 'mongoose';
import Review from '../models/Review.js';
import Paper from '../models/Paper.js';
import User from '../models/User.js';
import { sendEmail, templates } from '../services/emailService.js';

export async function createReview(req, res, next) {
  try {
    const { id } = req.params; // paper id or paperId
    const { ratings, additionalQuestions, recommendation, confidentialCommentsToEditor, commentsToAuthor } = req.body;
    const reviewerId = req.user.id;

    const query = mongoose.isValidObjectId(id) ? { _id: id } : { paperId: id };
    const paper = await Paper.findOne(query).populate(['author', 'editor']);
    if (!paper) return res.status(404).json({ message: 'Paper not found' });

    const assigned = (paper.assignedReviewers || []).map(r => r.toString());
    if (!assigned.includes(reviewerId)) {
      return res.status(403).json({ message: 'You are not assigned to this paper' });
    }

    const reviewUploads = req.files ? req.files.map(file => file.path) : [];

    const review = await Review.create({
      paper: paper._id,
      reviewer: new mongoose.Types.ObjectId(reviewerId),
      ratings: JSON.parse(ratings),
      additionalQuestions: JSON.parse(additionalQuestions),
      recommendation,
      confidentialCommentsToEditor,
      commentsToAuthor,
      reviewUploads,
    });

    paper.status = 'Review Received';
    await paper.save();

    // Notify Editor and Reviewer
    if (paper.editor?.email) {
      await sendEmail({ to: paper.editor.email, subject: `Review Received for ${paper.paperId}`, html: `<p>A review has been received for paper ${paper.paperId}.</p>` });
    }
    const reviewer = await User.findById(reviewerId);
    if (reviewer?.email) {
      await sendEmail({ to: reviewer.email, subject: 'Thank you for your review', html: `<p>Thank you for submitting your review for paper ${paper.paperId}.</p>` });
    }

    return res.status(201).json({ message: 'Review submitted', review });
  } catch (err) { next(err); }
}

export async function listReviews(req, res, next) {
  try {
    const { id } = req.params; // paper id or paperId
    const user = req.user;

    const query = mongoose.isValidObjectId(id) ? { _id: id } : { paperId: id };
    const paper = await Paper.findOne(query);
    if (!paper) return res.status(404).json({ message: 'Paper not found' });

    // Access rules: Admin can view; Author can view if owns; Reviewer can view if assigned; Editor can view if assigned
    const isAuthor = paper.author.toString() === user.id;
    const isReviewer = paper.assignedReviewers.map(r => r.toString()).includes(user.id);
    const isEditor = paper.editor?.toString() === user.id;

    if (!(user.role === 'Admin' || isAuthor || isReviewer || isEditor)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const reviews = await Review.find({ paper: paper._id })
      .populate('reviewer', 'email role name')
      .sort({ createdAt: -1 });

    return res.json({ reviews });
  } catch (err) { next(err); }
}
