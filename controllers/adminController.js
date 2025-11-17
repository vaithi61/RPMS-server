import User from '../models/User.js';
import Paper from '../models/Paper.js';
import { sendEmail } from '../services/emailService.js';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

export async function searchUsers(req, res, next) {
  try {
    const { q, role } = req.query;
    const filter = { isVerified: true };
    if (role) {
      filter.role = role;
    }
    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: regex }, { email: regex }];
    }
    const users = await User.find(filter).select('_id name email role').limit(20);
    return res.json({ users });
  } catch (err) {
    next(err);
  }
}

export const assignEditor = async (req, res) => {
  try {
    const { paperId, editorId } = req.body;
    const paper = await Paper.findById(paperId).populate('author');
    if (!paper) {
      return res.status(404).json({ message: 'Paper not found' });
    }

    const editor = await User.findById(editorId);
    if (!editor || editor.role !== 'Editor') {
      return res.status(400).json({ message: 'Invalid editor selected' });
    }

    paper.editor = editorId;
    paper.status = 'Editor Assigned';
    await paper.save();

    // Notify editor and author
    await sendEmail({ to: editor.email, subject: `New Paper Assignment: ${paper.paperId}`, html: `You have been assigned a new paper: ${paper.paperId}.` });
    await sendEmail({ to: paper.author.email, subject: `Editor Assigned for ${paper.paperId}`, html: `An editor has been assigned to your paper ${paper.paperId}.` });

    res.status(200).json({ message: 'Editor assigned successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error assigning editor', error: error.message });
  }
};

export const reassignEditor = async (req, res) => {
  try {
    const { paperId, newEditorId } = req.body;
    const paper = await Paper.findById(paperId).populate(['author', 'editor']);
    if (!paper) {
      return res.status(404).json({ message: 'Paper not found' });
    }

    const oldEditor = paper.editor;
    const newEditor = await User.findById(newEditorId);
    if (!newEditor || newEditor.role !== 'Editor') {
      return res.status(400).json({ message: 'Invalid new editor selected' });
    }

    paper.editor = newEditorId;
    paper.status = 'Editor Reassigned';
    await paper.save();

    // Notify old editor, new editor, and author
    if (oldEditor) {
      await sendEmail({ to: oldEditor.email, subject: `Paper Reassigned: ${paper.paperId}`, html: `Paper ${paper.paperId} has been reassigned to another editor.` });
    }
    await sendEmail({ to: newEditor.email, subject: `New Paper Assignment: ${paper.paperId}`, html: `You have been assigned a new paper: ${paper.paperId}.` });
    await sendEmail({ to: paper.author.email, subject: `Editor Reassigned for ${paper.paperId}`, html: `The editor for your paper ${paper.paperId} has been changed.` });

    res.status(200).json({ message: 'Editor reassigned successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error reassigning editor', error: error.message });
  }
};

export const addNewEditor = async (req, res) => {
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
      role: 'Editor',
      isVerified: true, // Or send a verification email
    });
    await newUser.save();

    // Send credentials to the new editor
    await sendEmail({ to: email, subject: 'Your New Editor Account', html: `Welcome! Your account has been created. Your temporary password is: ${tempPassword}` });

    res.status(201).json({ message: 'Editor account created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error creating editor account', error: error.message });
  }
};

export const manageUser = async (req, res) => {
  try {
    const { userId, action } = req.body; // action can be 'suspend', 'reactivate', 'delete'
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    switch (action) {
      case 'suspend':
        // Implement suspension logic (e.g., user.isSuspended = true)
        break;
      case 'reactivate':
        // Implement reactivation logic
        break;
      case 'delete':
        await User.findByIdAndDelete(userId);
        return res.status(200).json({ message: 'User deleted successfully' });
      default:
        return res.status(400).json({ message: 'Invalid action' });
    }
    
    await user.save();
    res.status(200).json({ message: `User ${action}ed successfully` });
  } catch (error) {
    res.status(500).json({ message: 'Error managing user', error: error.message });
  }
};
