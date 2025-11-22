import mongoose from 'mongoose';
import Paper from '../models/Paper.js';
import User from '../models/User.js';
import Counter from '../models/Counter.js';
import { sendEmail, templates } from '../services/emailService.js';
import { uploadToDrive } from '../services/gdriveService.js'; // Import uploadToDrive

async function nextPaperId() {
  const year = new Date().getFullYear().toString().slice(-2);
  const name = `paper-${year}`;
  const counter = await Counter.findOneAndUpdate(
    { name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const seq = counter.seq;
  return `RPMS${year}-${String(seq).padStart(3, '0')}`;
}

export async function submitPaper(req, res, next) {
  try {
    const { title, abstract } = req.body;
    if (!title || !abstract) return res.status(400).json({ message: 'Title and abstract are required' });
    if (!req.file) return res.status(400).json({ message: 'File is required' });

    const authorId = req.user.id;
    const paperId = await nextPaperId();

    // Upload file to Google Drive
    const fileMetadata = await uploadToDrive({ 
      name: req.file.originalname, 
      mimeType: req.file.mimetype, 
      body: req.file.buffer 
    });
    const gDriveFileId = fileMetadata.id; // Assuming uploadToDrive returns an object with an 'id' property

    const paper = await Paper.create({
      paperId,
      title,
      abstract,
      author: authorId,
      status: 'Submitted',
      filePath: gDriveFileId, // Store Google Drive File ID
      versions: [{
        version: 1,
        filePath: gDriveFileId, // Store Google Drive File ID
        submittedAt: new Date(),
      }],
    });

    // Email notifications
    const author = await User.findById(authorId);
    await sendEmail({ to: author.email, subject: 'Submission received', html: templates.submissionConfirmation(paper.paperId) });
    const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || process.env.SMTP_USER;
    if (adminEmail) {
      await sendEmail({ to: adminEmail, subject: `New Paper Submitted by ${author.name}`, html: `<p>New paper submitted by ${author.name}.</p>` });
    }

    return res.status(201).json({ message: 'Paper submitted', paper });
  } catch (err) { next(err); }
}

export async function resubmitPaper(req, res, next) {
  try {
    const { id } = req.params; // paperId or _id
    if (!req.file) return res.status(400).json({ message: 'File is required' });
    const query = mongoose.isValidObjectId(id) ? { _id: id } : { paperId: id };
    const paper = await Paper.findOne(query).populate('author');
    if (!paper) return res.status(404).json({ message: 'Paper not found' });

    // Only author (or admin) can resubmit; author must own the paper
    const isAdmin = req.user.role === 'Admin';
    if (!isAdmin && paper.author._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const nextVersion = (paper.versions.length || 0) + 1;
    
    // Upload revised file to Google Drive
    const fileMetadata = await uploadToDrive({ 
      name: req.file.originalname, 
      mimeType: req.file.mimetype, 
      body: req.file.buffer 
    });
    const gDriveFileId = fileMetadata.id; // Assuming uploadToDrive returns an object with an 'id' property

    paper.versions.push({ 
      version: nextVersion, 
      filePath: gDriveFileId, // Store Google Drive File ID
      submittedAt: new Date() 
    });
    paper.filePath = gDriveFileId; // Update current filePath to new GDrive File ID
    paper.status = 'Revised Submitted';
    await paper.save();

    const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || process.env.SMTP_USER;

    return res.json({ message: 'Revision submitted', paper });
  } catch (err) { next(err); }
}

export async function listPapers(req, res, next) {
  try {
    const user = req.user;
    let query = {};
    if (user.role === 'Author') {
      query.author = user.id;
    } else if (user.role === 'Reviewer') {
      query.assignedReviewers = new mongoose.Types.ObjectId(user.id);
    } else if (user.role === 'Editor') {
      // Editors should only see papers assigned to them
      query.editor = new mongoose.Types.ObjectId(user.id);
    }

    const { status, author: authorEmail, reviewer } = req.query || {};
    if (typeof status === 'string' && status.length > 0 && status !== 'All') {
      query.status = status;
    } else if (user.role === 'Reviewer' && status !== 'All') {
      // Default reviewer view (when not explicitly asking for All): only active papers
      query.status = { $nin: ['Accepted', 'Rejected'] };
    }
    if (reviewer && user.role === 'Admin') {
      query.assignedReviewers = new mongoose.Types.ObjectId(reviewer);
    }
    if (authorEmail) {
      const regex = new RegExp(authorEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const authors = await User.find({ email: regex }).select('_id');
      const ids = authors.map(a => a._id);
      query.author = { $in: ids };
    }

    const papers = await Paper.find(query)
      .populate('author', 'email role name')
      .populate('assignedReviewers', 'email role name')
      .select('+finalFilePath') // Explicitly select finalFilePath
      .sort({ createdAt: -1 });
    return res.json({ papers });
  } catch (err) { next(err); }
}

export async function getPaperHistory(req, res, next) {
  try {
    const { id } = req.params;
    const query = mongoose.isValidObjectId(id) ? { _id: id } : { paperId: id };
    const paper = await Paper.findOne(query)
      .populate('author', 'email name')
      .populate('assignedReviewers', 'email name role');
    if (!paper) return res.status(404).json({ message: 'Paper not found' });

    // Access: Admin, Author (owner), assigned Reviewer, or assigned Editor
    const user = req.user;
    const isAdmin = user.role === 'Admin';
    const isAuthor = paper.author?._id?.toString?.() === user.id;
    const isReviewer = (paper.assignedReviewers || []).map(r=> r._id?.toString?.()).includes(user.id);
    const isEditor = paper.editor?._id?.toString?.() === user.id; // Check if the current user is the assigned editor

    if (!(isAdmin || isAuthor || isReviewer || isEditor)) return res.status(403).json({ message: 'Forbidden' });
    return res.json({
      paperId: paper.paperId,
      title: paper.title,
      status: paper.status,
      currentVersion: paper.currentVersion,
      versions: paper.versions || [],
      author: paper.author,
      assignedReviewers: paper.assignedReviewers,
    });
  } catch (err) { next(err); }
}

// (duplicate block removed)
