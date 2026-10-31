const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Import User model (assuming it's available)
const mongoose = require('mongoose');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/bulk');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'students-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.xlsx', '.xls', '.csv'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) and CSV files are allowed'));
    }
  }
});

// Bulk Student Upload Route
router.post('/students/bulk-upload', upload.single('studentFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    console.log('Processing file:', req.file.filename);
    
    // Read the uploaded file
    const filePath = req.file.path;
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const jsonData = xlsx.utils.sheet_to_json(worksheet);
    
    if (jsonData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'The uploaded file is empty or has no valid data'
      });
    }

    // Process student data
    const results = {
      total: jsonData.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    // Get User model from mongoose models
    const User = mongoose.model('User');

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rowNum = i + 2; // Excel row number (accounting for header)

      try {
        // Map Excel columns to our schema (flexible column naming)
        const studentData = {
          name: row.Name || row.name || row['Student Name'] || row['Full Name'],
          email: row.Email || row.email || row['Email Address'],
          rollNo: String(row['Roll No'] || row['Roll Number'] || row.rollNo || row['Roll']),
          division: row.Division || row.division || row.class || row.Class || 'I',
          course: row.Course || row.course || 'Computer Science and Engineering',
          parentEmail: row['Parent Email'] || row.parentEmail || row['Parent\'s Email'],
          role: 'student',
          password: 'student123' // Default password
        };

        // Validate required fields
        if (!studentData.name || !studentData.email || !studentData.rollNo) {
          results.errors.push({
            row: rowNum,
            error: 'Missing required fields (Name, Email, Roll No)',
            data: row
          });
          results.skipped++;
          continue;
        }

        // Check if student already exists
        const existingStudent = await User.findOne({
          $or: [
            { email: studentData.email },
            { rollNo: studentData.rollNo }
          ]
        });

        if (existingStudent) {
          // Update existing student
          await User.findByIdAndUpdate(existingStudent._id, {
            name: studentData.name,
            division: studentData.division,
            course: studentData.course,
            parentEmail: studentData.parentEmail
          });
          results.updated++;
        } else {
          // Create new student
          const newStudent = new User(studentData);
          await newStudent.save();
          results.created++;
        }

      } catch (error) {
        results.errors.push({
          row: rowNum,
          error: error.message,
          data: row
        });
        results.skipped++;
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: `Bulk upload completed. Created: ${results.created}, Updated: ${results.updated}, Skipped: ${results.skipped}`,
      results: results
    });

  } catch (error) {
    console.error('Bulk upload error:', error);
    
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'Failed to process bulk upload',
      error: error.message
    });
  }
});

module.exports = router;
