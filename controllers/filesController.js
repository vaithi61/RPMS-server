import Paper from '../models/Paper.js';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function downloadFile(req, res, next) {
  try {
    const { id } = req.params; // paper id or paperId
    const user = req.user;

    const query = mongoose.isValidObjectId(id) ? { _id: id } : { paperId: id };
    const paper = await Paper.findOne(query);
    if (!paper) return res.status(404).json({ message: 'Paper not found' });

    const isAuthor = paper.author.toString() === user.id;
    const isReviewer = paper.assignedReviewers.map(r => r.toString()).includes(user.id);
    const isAdmin = user.role === 'Admin';
    const isEditor = paper.editor?.toString() === user.id;
    const isProductionEditor = user.role === 'Production Editor';

    if (!(isAdmin || isAuthor || isReviewer || isEditor || isProductionEditor)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    let filePathToServe = '';
    let fileName = 'download';

    // Determine which file to serve based on context and user role
    if (paper.filePath && (isAdmin || isAuthor || isEditor || isReviewer)) {
      filePathToServe = paper.filePath;
      fileName = `paper_${paper.paperId}.pdf`;
    } else if (paper.versions && paper.versions.length > 0 && (isAdmin || isAuthor || isEditor || isReviewer)) {
      // Serve the latest version if available
      const latestVersion = paper.versions[paper.versions.length - 1];
      filePathToServe = latestVersion.filePath;
      fileName = `paper_${paper.paperId}_v${latestVersion.version}.pdf`;
    } else if (user.role === 'Production Editor' && paper.finalFilePath) {
      filePathToServe = paper.finalFilePath;
      fileName = `final_paper_${paper.paperId}.pdf`;
    } else {
      return res.status(404).json({ message: 'File not found or not authorized to access this file.' });
    }

    const absolutePath = path.join(__dirname, '..', filePathToServe);

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ message: 'File not found on server.' });
    }

    res.setHeader('Content-Type', 'application/pdf'); // Assuming all downloadable files are PDFs
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    const fileStream = fs.createReadStream(absolutePath);
    fileStream.on('error', next);
    fileStream.pipe(res);
  } catch (err) { next(err); }
}
