const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const Material = require('../models/Material');
const mongoose = require('mongoose');
const { extractText, cleanText } = require('../utils/extractText');

// Configure multer for file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/materials');
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.jpg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, PPT, TXT, JPG, PNG are allowed.'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Upload material
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const { title, description, type, subject, semester } = req.body;

    // Validate required fields
    if (!title || !type || !subject || !semester) {
      // Clean up uploaded file if validation fails
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ success: false, error: 'Missing required fields: title, type, subject, semester' });
    }

    // Get a teacher ID from the database (use the first teacher found)
    const Teacher = mongoose.model('User');
    const teacher = await Teacher.findOne({ role: 'teacher' });

    if (!teacher) {
      // Clean up uploaded file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ success: false, error: 'No teacher found in database' });
    }

    // Create material document
    const material = new Material({
      title,
      description,
      type,
      subject,
      semester: parseInt(semester),
      filename: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      uploadedBy: teacher._id,
      uploadDate: new Date()
    });

    await material.save();
    
    // Extract text from the uploaded file (async, don't block response)
    const fileExtension = path.extname(req.file.originalname);
    extractTextFromFile(material._id, req.file.path, fileExtension);

    console.log(`Material uploaded successfully: ${title} by ${teacher.name}`);
    res.status(201).json({ success: true, message: 'File uploaded successfully', material });
  } catch (error) {
    console.error('Material upload error:', error);
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function to extract text asynchronously
async function extractTextFromFile(materialId, filePath, fileExtension) {
  try {
    console.log(`Starting text extraction for material ${materialId}...`);
    const extractedText = await extractText(filePath, fileExtension);
    const cleanedText = cleanText(extractedText);

    // Update the material with extracted text
    await Material.findByIdAndUpdate(materialId, {
      extractedText: cleanedText,
      textExtracted: true,
      extractionError: null
    });

    console.log(`Text extraction completed for material ${materialId}`);
  } catch (error) {
    console.error(`Text extraction failed for material ${materialId}:`, error.message);

    // Update material with error information
    await Material.findByIdAndUpdate(materialId, {
      textExtracted: false,
      extractionError: error.message
    });
  }
}

// Get materials
router.get('/', async (req, res) => {
  try {
    const { type, subject, semester } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (subject) filter.subject = subject;
    if (semester) filter.semester = semester;

    const materials = await Material.find(filter).populate('uploadedBy', 'name').sort({ uploadDate: -1 });
    res.json({ success: true, materials });
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Utility route to extract text from existing materials
router.post('/extract-all', async (req, res) => {
  try {
    const materials = await Material.find({ textExtracted: false });

    let processed = 0;
    let failed = 0;

    for (const material of materials) {
      try {
        const fileExtension = path.extname(material.originalName);
        await extractTextFromFile(material._id, material.filePath, fileExtension);
        processed++;
      } catch (error) {
        console.error(`Failed to extract text for ${material._id}:`, error);
        failed++;
      }
    }

    res.json({
      message: 'Text extraction initiated',
      processed,
      failed,
      total: materials.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download material
router.get('/download/:id', async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    // Check if file exists on disk
    if (!fs.existsSync(material.filePath)) {
      return res.status(404).json({ success: false, error: 'File not found on server' });
    }

    console.log(`Downloading material: ${material.title} (${material.originalName})`);
    res.download(material.filePath, material.originalName);
  } catch (error) {
    console.error('Material download error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete material
router.delete('/:id', async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ success: false, error: 'Material not found' });
    }

    // Delete file from disk
    if (fs.existsSync(material.filePath)) {
      fs.unlinkSync(material.filePath);
      console.log(`Deleted file: ${material.filePath}`);
    }

    // Delete from database
    await Material.findByIdAndDelete(req.params.id);
    
    console.log(`Material deleted successfully: ${material.title}`);
    res.json({ success: true, message: 'Material deleted successfully' });
  } catch (error) {
    console.error('Material deletion error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
