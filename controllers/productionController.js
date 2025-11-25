import Production from '../models/Production.js';
import Paper from '../models/Paper.js';
import { sendEmail } from '../services/emailService.js';

// Upload final formatted file
export const uploadFinalFile = async (req, res) => {
  try {
    console.log('=== UPLOAD FINAL FILE DEBUG ===');
    console.log('req.params.paperId:', req.params.paperId);
    console.log('req.file:', req.file);

    const { paperId } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: 'Final file is required' });
    }

    const paper = await Paper.findById(paperId).populate('author');
    if (!paper) {
      return res.status(404).json({ message: 'Paper not found' });
    }

    // Use secure_url from Cloudinary, fallback to path
    const finalFileUrl = req.file.secure_url || req.file.path;
    console.log('Final file URL:', finalFileUrl);

    if (!finalFileUrl) {
      return res.status(500).json({ message: 'File upload failed - no URL generated' });
    }

    // Update the Paper document with the final file path
    paper.finalFilePath = finalFileUrl;
    paper.status = 'Proof Approved';
    console.log('Setting paper.finalFilePath to:', paper.finalFilePath);
    await paper.save();
    console.log('Paper saved successfully with finalFilePath');

    // Notify author
    await sendEmail({
      to: paper.author.email,
      subject: `Paper ${paper.paperId} in Production`,
      html: `<p>Your paper <strong>${paper.paperId}</strong> is now in the production stage.</p>`
    });

    res.status(200).json({ message: 'Final file uploaded successfully', paper });
  } catch (error) {
    console.error('Upload final file error:', error);
    res.status(500).json({ message: 'Error uploading final file', error: error.message });
  }
};

// Update publication status
export const updatePublicationStatus = async (req, res) => {
  try {
    const { productionId, status } = req.body;

    // productionId is actually the paperId from frontend
    const paper = await Paper.findById(productionId).populate('author');
    if (!paper) {
      return res.status(404).json({ message: 'Paper not found' });
    }

    paper.status = status;
    await paper.save();

    if (status === 'Published') {
      await sendEmail({
        to: paper.author.email,
        subject: `Paper ${paper.paperId} Published`,
        html: `<p>Congratulations! Your paper <strong>${paper.paperId}</strong> has been published.</p>`
      });
    }

    res.status(200).json({ message: 'Publication status updated successfully', paper });
  } catch (error) {
    console.error('Update publication status error:', error);
    res.status(500).json({ message: 'Error updating publication status', error: error.message });
  }
};
