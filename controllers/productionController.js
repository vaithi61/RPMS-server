import Production from '../models/Production.js';
import Paper from '../models/Paper.js';
import { sendEmail } from '../services/emailService.js';

// Upload final formatted file
export const uploadFinalFile = async (req, res) => {
  try {
    const { paperId } = req.params;
    const paper = await Paper.findById(paperId).populate('author');
    if (!paper) {
      return res.status(404).json({ message: 'Paper not found' });
    }

    // Update the Paper document with the final file path
    paper.finalFilePath = req.file.path;
    paper.status = 'Awaiting Proof'; // Set status to Awaiting Proof after final file upload
    console.log('Setting paper.finalFilePath to:', paper.finalFilePath); // Log before saving
    await paper.save();
    console.log('Paper saved with finalFilePath:', paper.finalFilePath); // Log after saving

    // Create a Production record (if needed, or integrate into Paper model)
    // For now, we'll assume Production model is for tracking publication status
    // and the finalFilePath is directly on the Paper model.
    // If a separate Production document is still desired for other reasons,
    // its creation logic would go here.
    // const production = new Production({
    //   paperId,
    //   finalFilePath: req.file.path, // This would be redundant if on Paper model
    // });
    // await production.save();

    // Notify author and admin
    sendEmail(paper.author.email, `Paper ${paper.paperId} in Production`, 'Your paper is now in the production stage.');
    // sendEmail(adminEmail, `Production Started for ${paper.paperId}`, `Production has started for paper ${paper.paperId}.`);

    res.status(200).json({ message: 'Final file uploaded successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error uploading final file', error: error.message });
  }
};

// Update publication status
export const updatePublicationStatus = async (req, res) => {
  try {
    const { productionId, status } = req.body;
    const production = await Production.findById(productionId).populate({
      path: 'paperId',
      populate: { path: 'author' }
    });
    if (!production) {
      return res.status(404).json({ message: 'Production record not found' });
    }

    production.status = status;
    if (status === 'Published') {
      production.publicationDate = Date.now();
    }
    await production.save();

    const paper = await Paper.findById(production.paperId._id);
    paper.status = status;
    await paper.save();

    if (status === 'Published') {
      sendEmail(production.paperId.author.email, `Paper ${paper.paperId} Published`, 'Congratulations! Your paper has been published.');
    }

    res.status(200).json({ message: 'Publication status updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating publication status', error: error.message });
  }
};
