require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const nodemailer = require('nodemailer');
const multer = require('multer');
const xlsx = require('xlsx');


const app = express();

// Middleware
// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/bulk/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.xlsx', '.xls', '.csv'];
    const ext = require('path').extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  }
});
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===== MONGODB CONNECTION WITH EXACT STRING =====
console.log('🔗 Using EXACT MongoDB connection string...');
console.log('String:', process.env.MONGODB_URI.replace(/:[^:]*@/, ':********@'));

const connectDB = async () => {
  try {
    // Use the exact connection string from .env
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 15000,
    });
    
    console.log('✅ MongoDB Connected Successfully!');
    console.log('📊 Database:', mongoose.connection.db.databaseName);
    
  } catch (error) {
    console.log('❌ MongoDB Connection Failed:');
    console.log('Error:', error.message);
    console.log('\n💡 Please check:');
    console.log('1. Network Access in MongoDB Atlas');
    console.log('2. Password in .env file');
    console.log('3. Exact connection string format');
    process.exit(1); // Stop server if MongoDB fails
  }
};

// Initialize connection
connectDB();

// ===== DATABASE MODELS =====
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['teacher', 'student'], required: true },
  rollNo: { type: String },
  division: { type: String, enum: ['I', 'II'] },
  course: { type: String, default: 'COMPS' },
  subject: { type: String },
  department: { type: String, default: 'COMPS' },
  parentEmail: { type: String, lowercase: true, trim: true }
}, { timestamps: true });

const attendanceSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ['present', 'absent'], required: true },
  subject: { type: String, required: false },
  department: { type: String, default: 'COMPS' }
}, { timestamps: true });

// Subjects
const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  teacherName: { type: String },
  department: { type: String, default: 'COMPS' }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Attendance = mongoose.model('Attendance', attendanceSchema);
const Subject = mongoose.model('Subject', subjectSchema);

// Import routes
const materialRoutes = require('./routes/materialRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const attendanceExportRoutes = require('./routes/attendanceExportRoutes');

// ===== AUTH ROUTES =====
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // If passwords are stored in plain text (from setup), allow direct compare; otherwise bcrypt compare
    let isMatch = false;
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      isMatch = password === user.password;
    }

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        rollNo: user.rollNo,
        division: user.division,
        course: user.course,
      },
      token
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ===== STUDENT ROUTES =====
app.get('/api/students', async (req, res) => {
  try {
    const { division } = req.query;
    const query = { role: 'student' };
    if (division) query.division = division;
    const students = await User.find(query).sort({ rollNo: 1 });
    res.json({ success: true, students });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to fetch students' });
  }
});

app.post('/api/students', async (req, res) => {
  try {
    const { name, email, rollNo, division, course, password, parentEmail } = req.body;
    const exists = await User.findOne({ $or: [{ email }, { rollNo }] });
    if (exists) return res.status(400).json({ success: false, message: 'Student already exists' });
    const user = new User({ 
      name, 
      email, 
      rollNo, 
      division, 
      course, 
      role: 'student', 
      password: password || 'student123',
      parentEmail: parentEmail || undefined
    });
    await user.save();
    res.status(201).json({ success: true, student: user });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to add student' });
  }
});

// Update parent email for existing student
app.put('/api/students/:id/parent-email', async (req, res) => {
  try {
    const { id } = req.params;
    const { parentEmail } = req.body;
    
    if (!parentEmail) {
      return res.status(400).json({ success: false, message: 'Parent email is required' });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(parentEmail)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }
    
    const student = await User.findOneAndUpdate(
      { _id: id, role: 'student' },
      { parentEmail: parentEmail.toLowerCase().trim() },
      { new: true }
    );
    
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    
    res.json({ success: true, message: 'Parent email updated successfully', student });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to update parent email' });
  }
});

// Delete student
app.delete('/api/students/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const student = await User.findOneAndDelete({ _id: id, role: 'student' });
    
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    
    res.json({ success: true, message: 'Student deleted successfully' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to delete student' });
  }
});

// Bulk student upload
app.post('/api/students/bulk-upload', upload.single('studentFile'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({success: false, message: 'No file uploaded'});
    
    console.log('Processing bulk upload file:', req.file.filename);
    
    const workbook = xlsx.readFile(req.file.path);
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    
    console.log('Parsed data:', data.length, 'rows');
    if (data.length > 0) {
      console.log('Sample row:', data[0]);
    }
    
    const results = {created: 0, updated: 0, errors: []};
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // Excel row number (accounting for header)
      
      try {
        // Map Excel columns to our schema - handle multiple possible column names
        const studentData = {
          name: row['Student Name'] || row.Name || row.name || row['Full Name'],
          email: row['Email Id'] || row.Email || row.email || row['Email Address'],
          rollNo: String(row['Roll No'] || row.rollNo || row['Roll Number'] || row.Roll),
          division: row.Division || row.division || row.Class || row.class || 'I',
          course: row['Branch Allotted'] || row.Course || row.course || 'COMPS',
          parentEmail: row['parent email'] || row['Parent Email'] || row.parentEmail || row['Parent\'s Email'],
          role: 'student',
          password: 'student123'
        };
        
        // Validate required fields
        if (!studentData.name || !studentData.email || !studentData.rollNo) {
          results.errors.push(`Row ${rowNum}: Missing required fields (Student Name, Email Id, Roll No)`);
          continue;
        }
        
        // Check for valid email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(studentData.email)) {
          results.errors.push(`Row ${rowNum}: Invalid email format - ${studentData.email}`);
          continue;
        }
        
        const existing = await User.findOne({
          $or: [{email: studentData.email}, {rollNo: studentData.rollNo}]
        });
        
        if (existing) {
          // Update existing student
          await User.findByIdAndUpdate(existing._id, {
            name: studentData.name,
            division: studentData.division,
            course: studentData.course,
            parentEmail: studentData.parentEmail
          });
          results.updated++;
          console.log(`Updated student: ${studentData.name} (${studentData.rollNo})`);
        } else {
          // Create new student
          await new User(studentData).save();
          results.created++;
          console.log(`Created student: ${studentData.name} (${studentData.rollNo})`);
        }
      } catch (err) {
        console.error(`Error processing row ${rowNum}:`, err.message);
        results.errors.push(`Row ${rowNum}: ${err.message}`);
      }
    }
    
    require('fs').unlinkSync(req.file.path); // cleanup
    
    console.log('Bulk upload results:', results);
    res.json({
      success: true, 
      results,
      message: `Bulk upload completed. Created: ${results.created}, Updated: ${results.updated}, Errors: ${results.errors.length}`
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    if (req.file && require('fs').existsSync(req.file.path)) {
      require('fs').unlinkSync(req.file.path);
    }
    res.status(500).json({success: false, message: error.message});
  }
});
// ===== ATTENDANCE ROUTES =====
// Mark attendance for a specific date
app.post('/api/attendance/mark', async (req, res) => {
  try {
    const { date, attendanceData, subject } = req.body;
    if (!date || !Array.isArray(attendanceData)) {
      return res.status(400).json({ success: false, message: 'Invalid payload' });
    }

    const targetDateStart = new Date(date);
    targetDateStart.setHours(0, 0, 0, 0);
    const targetDateEnd = new Date(targetDateStart);
    targetDateEnd.setDate(targetDateEnd.getDate() + 1);

    const ops = attendanceData.map(({ studentId, status }) =>
      Attendance.findOneAndUpdate(
        { studentId, date: { $gte: targetDateStart, $lt: targetDateEnd } },
        { $set: { studentId, status, date: targetDateStart, subject } },
        { upsert: true, new: true }
      )
    );

    await Promise.all(ops);
    res.json({ success: true, message: 'Attendance saved' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to mark attendance' });
  }
});

// ===== SUBJECT ROUTES =====
app.get('/api/subjects', async (req, res) => {
  try {
    const subjects = await Subject.find().sort({ name: 1 });
    res.json({ success: true, subjects });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to fetch subjects' });
  }
});

// Get attendance records with optional filters
app.get('/api/attendance/records', async (req, res) => {
  try {
    const { studentId, from, to, subject } = req.query;
    const query = {};
    if (studentId) query.studentId = studentId;
    if (subject) query.subject = subject;
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(new Date(from).setHours(0,0,0,0));
      if (to) query.date.$lte = new Date(new Date(to).setHours(23,59,59,999));
    }
    const attendance = await Attendance.find(query).sort({ date: -1 });
    res.json({ success: true, attendance });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to fetch attendance' });
  }
});

// Get attendance stats for a student
app.get('/api/attendance/stats/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { subject } = req.query;
    const query = { studentId };
    if (subject) query.subject = subject;
    const records = await Attendance.find(query);
    const totalDays = records.length;
    const presentDays = records.filter(r => r.status === 'present').length;
    const absentDays = totalDays - presentDays;
    const percentage = totalDays ? Math.round((presentDays / totalDays) * 100) : 0;
    res.json({ success: true, stats: { totalDays, presentDays, absentDays, percentage } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

// ===== EMAIL CONFIGURATION =====
const createEmailTransporter = () => {
  // For development, use a test service like Ethereal or Gmail
  // In production, use your actual email service
  return nodemailer.createTransport({
    service: 'gmail', // You can change this to your email provider
    auth: {
      user: process.env.EMAIL_USER || 'your-email@gmail.com', // Add to .env file
      pass: process.env.EMAIL_PASS || 'your-app-password'     // Add to .env file
    }
  });
};

// Send attendance alert email
app.post('/api/attendance/alert', async (req, res) => {
  try {
    const { studentId } = req.body;
    
    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Student ID is required' });
    }
    
    // Get student details
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    
    if (!student.parentEmail) {
      return res.status(400).json({ 
        success: false, 
        message: 'Parent email not found. Please update parent email first.' 
      });
    }
    
    // Get attendance stats
    const records = await Attendance.find({ studentId });
    const totalDays = records.length;
    const presentDays = records.filter(r => r.status === 'present').length;
    const absentDays = totalDays - presentDays;
    const percentage = totalDays ? Math.round((presentDays / totalDays) * 100) : 0;
    
    if (percentage >= 75) {
      return res.status(400).json({ 
        success: false, 
        message: `Student attendance is ${percentage}%. Alert only sent for attendance below 75%.` 
      });
    }
    
    // Create email content
    const emailSubject = `Attendance Alert - ${student.name} (Roll No: ${student.rollNo})`;
    const emailBody = `
Dear Parent,

This is an automated attendance alert for your child.

Student Details:
- Name: ${student.name}
- Roll Number: ${student.rollNo}
- Division: ${student.division}
- Course: ${student.course}

Attendance Summary:
- Total Classes: ${totalDays}
- Classes Attended: ${presentDays}
- Classes Missed: ${absentDays}
- Attendance Percentage: ${percentage}%

⚠️ ATTENTION: Your child's attendance is below the required 75% threshold.

Please ensure regular attendance to avoid academic complications.

For any queries, please contact the COMPS Department.

Best regards,
COMPS Department
COMPS
    `;
    
    // Send email (in development, this might fail without proper email configuration)
    try {
      const transporter = createEmailTransporter();
      
      const mailOptions = {
        from: `"COMPS Attendance System" <${process.env.EMAIL_USER}>`,
        to: student.parentEmail,
        subject: emailSubject,
        replyTo: process.env.EMAIL_USER,
        text: emailBody,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">🚨 Attendance Alert</h2>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Student Details:</h3>
              <ul>
                <li><strong>Name:</strong> ${student.name}</li>
                <li><strong>Roll Number:</strong> ${student.rollNo}</li>
                <li><strong>Division:</strong> ${student.division}</li>
                <li><strong>Course:</strong> ${student.course}</li>
              </ul>
            </div>
            
            <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #dc2626;">Attendance Summary:</h3>
              <ul>
                <li><strong>Total Classes:</strong> ${totalDays}</li>
                <li><strong>Classes Attended:</strong> ${presentDays}</li>
                <li><strong>Classes Missed:</strong> ${absentDays}</li>
                <li><strong>Attendance Percentage:</strong> <span style="color: #dc2626; font-size: 18px;">${percentage}%</span></li>
              </ul>
            </div>
            
            <div style="background-color: #fffbeb; border: 1px solid #fed7aa; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>⚠️ ATTENTION:</strong> Your child's attendance is below the required 75% threshold.</p>
              <p>Please ensure regular attendance to avoid academic complications.</p>
            </div>
            
            <p>For any queries, please contact the COMPS Department.</p>
            
            <hr style="margin: 30px 0;">
            <p style="color: #6b7280; font-size: 14px;">
              Best regards,<br>
              COMPS Department<br>
              COMPS
            </p>
          </div>
        `
      };
      
      await transporter.sendMail(mailOptions);
      
      res.json({ 
        success: true, 
        message: `Attendance alert sent successfully to ${student.parentEmail}`,
        attendancePercentage: percentage
      });
      
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Even if email fails, we can still return the attendance info
      res.json({ 
        success: false, 
        message: 'Failed to send email. Please check email configuration.',
        error: 'Email service not configured properly',
        attendancePercentage: percentage,
        parentEmail: student.parentEmail
      });
    }
    
  } catch (error) {
    console.error('Attendance alert error:', error);
    res.status(500).json({ success: false, message: 'Failed to process attendance alert' });
  }
});

// Optional: hash passwords for existing users created by setup on first run
app.post('/api/auth/hash-existing', async (req, res) => {
  try {
    const users = await User.find();
    let updated = 0;
    for (const u of users) {
      if (!u.password.startsWith('$2a$') && !u.password.startsWith('$2b$')) {
        u.password = await bcrypt.hash(u.password, 10);
        await u.save();
        updated++;
      }
    }
    res.json({ success: true, updated });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Hashing failed' });
  }
});

// ===== INITIAL SETUP ROUTE =====
app.get('/api/setup', async (req, res) => {
  try {
    console.log('🔄 Running initial setup...');
    
    // Create department teachers (TR logins)
    const deptTeachers = [
      { name: 'Dr Sagar Mohite', email: 'sagar.mohite@comps.com', password: 'teacher123', role: 'teacher', department: 'COMPS', subject: 'Internet of Things' },
      { name: 'Dr Shilpa Bhosale', email: 'shilpa.bhosale@comps.com', password: 'teacher123', role: 'teacher', department: 'COMPS', subject: 'Design and Analysis of Algorithm' },
      { name: 'Design Thinking', email: 'design.thinking@comps.com', password: 'teacher123', role: 'teacher', department: 'COMPS', subject: 'Design Thinking' },
      { name: 'Prof. Trupti Suryawanshi', email: 'trupti.suryawanshi@comps.com', password: 'teacher123', role: 'teacher', department: 'COMPS', subject: 'Software Testing and Quality Assurance' },
      { name: 'Vrushali Patil', email: 'vrushali.patil@comps.com', password: 'teacher123', role: 'teacher', department: 'COMPS', subject: 'Artificial Intelligence' },
    ];

    for (const t of deptTeachers) {
      const exists = await User.findOne({ email: t.email });
      if (!exists) {
        await new User(t).save();
        console.log(`✅ Teacher created: ${t.name} (${t.subject})`);
      }
    }
    
    // Sample students from your Excel file
    const sampleStudents = [
      { name: 'AYUSH ADITYA', email: 'aditya100ayush@gmail.com', rollNo: '1', division: 'I' },
      { name: 'MANAN AGARWAL', email: 'manan.agarwal1403@gmail.com', rollNo: '2', division: 'I' },
      { name: 'SOMIL AGRAWAL', email: 'somilagrawalsatna2020@gmail.com', rollNo: '3', division: 'I' },
      { name: 'SIMAR AHLUWALIA', email: '77munishwalia@gmail.com', rollNo: '4', division: 'I' },
    ];
    
    let createdCount = 0;
    for (const studentData of sampleStudents) {
      const exists = await User.findOne({ 
        $or: [
          { email: studentData.email },
          { rollNo: studentData.rollNo }
        ] 
      });
      
      if (!exists) {
        const student = new User({
          ...studentData,
          password: 'student123',
          role: 'student'
        });
        await student.save();
        createdCount++;
        console.log(`✅ Student created: ${studentData.name}`);
      }
    }
    
    // Seed subjects collection
    const subjects = [
      { name: 'Internet of Things', teacherName: 'Dr Sagar Mohite', department: 'COMPS' },
      { name: 'Design and Analysis of Algorithm', teacherName: 'Dr Shilpa Bhosale', department: 'COMPS' },
      { name: 'Design Thinking', teacherName: 'COMPS Department', department: 'COMPS' },
      { name: 'Software Testing and Quality Assurance', teacherName: 'Prof. Trupti Suryawanshi', department: 'COMPS' },
      { name: 'Artificial Intelligence', teacherName: 'Vrushali Patil', department: 'COMPS' },
    ];
    for (const s of subjects) {
      const exists = await Subject.findOne({ name: s.name });
      if (!exists) await new Subject(s).save();
    }

    res.json({
      success: true,
      message: `Setup completed! Created ${createdCount} students and ensured subjects/teachers.`,
      credentials: {
        departmentTeachers: deptTeachers.map(t => `${t.email} / teacher123`),
        students: 'Use student emails with password: student123'
      }
    });
    
  } catch (error) {
    res.json({
      success: false,
      message: 'Setup failed: ' + error.message
    });
  }
});

// Export attendance
app.get('/api/attendance/export', async (req, res) => {
  try {
    const {startDate, endDate, subject, division} = req.query;
    
    const query = {};
    if (startDate) query.date = {$gte: new Date(startDate)};
    if (endDate) query.date = {...query.date, $lte: new Date(endDate)};
    if (subject) query.subject = subject;
    
    const records = await Attendance.find(query).populate('studentId');
    
    const data = records.map(r => ({
      Date: r.date.toLocaleDateString(),
      'Roll No': r.studentId?.rollNo,
      'Student Name': r.studentId?.name,
      Status: r.status,
      Subject: r.subject
    }));
    
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(data);
    xlsx.utils.book_append_sheet(wb, ws, 'Attendance');
    
    const buffer = xlsx.write(wb, {type: 'buffer', bookType: 'xlsx'});
    
    res.setHeader('Content-Disposition', 'attachment; filename="attendance.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({success: false, message: error.message});
  }
});
// ===== TEST ROUTE =====
app.get('/api/test', async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    
    res.json({ 
      message: '🎉 COMPS Attendance System with MongoDB!',
      database: {
        status: 'Connected ✅',
        users: userCount,
        connection: 'Using exact MongoDB connection string'
      }
    });
    
  } catch (error) {
    res.json({
      message: 'System running but database error',
      error: error.message
    });
  }
});

// ===== HEALTH CHECK =====
app.get('/api/health', (req, res) => {
  res.json({ 
    status: mongoose.connection.readyState === 1 ? '✅ Healthy' : '⚠️ Database Issue',
    mongodb: {
      connected: mongoose.connection.readyState === 1,
      state: mongoose.connection.readyState,
      host: mongoose.connection.host
    },
    timestamp: new Date().toISOString()
  });
});

// Add new routes
app.use('/api/materials', materialRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/attendance', attendanceExportRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('🎉 ====================================');
  console.log('🚀 COMPS ATTENDANCE SYSTEM STARTED!');
  console.log('💾 Using EXACT MongoDB connection string');
  console.log(`📍 Server running on port ${PORT}`);
  console.log('🌐 Frontend: http://localhost:3000');
  console.log('📁 File uploads: http://localhost:5000/uploads');
  console.log('🎉 ====================================');
  console.log('💡 Run http://localhost:5000/api/setup to initialize data');
  console.log('🎉 ====================================');
});
