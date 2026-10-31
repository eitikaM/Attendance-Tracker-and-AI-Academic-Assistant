const express = require('express');
const xlsx = require('xlsx');
const router = express.Router();
const mongoose = require('mongoose');

// Export comprehensive attendance data
router.get('/export', async (req, res) => {
  try {
    const { startDate, endDate, subject, division, colorCode, defaulterThreshold } = req.query;
    const threshold = parseInt(defaulterThreshold) || 75;
    
    console.log('Exporting attendance with filters:', { startDate, endDate, subject, division, colorCode, threshold });
    
    // Get models
    const User = mongoose.model('User');
    const Attendance = mongoose.model('Attendance');
    
    // Build student query
    const studentQuery = { role: 'student' };
    if (division) studentQuery.division = division;
    
    // Get all students matching criteria
    const students = await User.find(studentQuery).sort({ rollNo: 1 });
    
    if (students.length === 0) {
      return res.status(404).json({ success: false, message: 'No students found matching criteria' });
    }
    
    // Build attendance query
    const attendanceQuery = {};
    if (startDate) attendanceQuery.date = { $gte: new Date(startDate) };
    if (endDate) attendanceQuery.date = { ...attendanceQuery.date, $lte: new Date(endDate) };
    if (subject) attendanceQuery.subject = subject;
    
    // Get all attendance records
    const allAttendance = await Attendance.find(attendanceQuery).populate('studentId');
    
    // Calculate comprehensive data for each student
    const exportData = [];
    
    for (const student of students) {
      // Get attendance records for this student
      const studentAttendance = allAttendance.filter(record => 
        record.studentId && record.studentId._id.toString() === student._id.toString()
      );
      
      if (subject) {
        // Single subject analysis
        const subjectRecords = studentAttendance.filter(record => record.subject === subject);
        const totalClasses = subjectRecords.length;
        const presentClasses = subjectRecords.filter(record => record.status === 'present').length;
        const percentage = totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 100) : 0;
        
        exportData.push({
          'Roll No': student.rollNo,
          'Student Name': student.name,
          'Division': student.division,
          'Subject': subject,
          'Total Classes': totalClasses,
          'Classes Attended': presentClasses,
          'Classes Missed': totalClasses - presentClasses,
          'Attendance %': percentage,
          'Status': percentage < threshold ? 'DEFAULTER' : 'REGULAR',
          'Parent Email': student.parentEmail || 'Not Provided',
          'Student Email': student.email,
          'Course': student.course || 'Computer Science and Engineering'
        });
      } else {
        // Multi-subject analysis - calculate overall attendance
        let totalClasses = 0;
        let totalPresent = 0;
        
        const subjects = [...new Set(studentAttendance.map(record => record.subject))];
        
        if (subjects.length === 0) {
          // Student with no attendance records
          exportData.push({
            'Roll No': student.rollNo,
            'Student Name': student.name,
            'Division': student.division,
            'Subject': 'No Records',
            'Total Classes': 0,
            'Classes Attended': 0,
            'Classes Missed': 0,
            'Attendance %': 0,
            'Status': 'NO DATA',
            'Parent Email': student.parentEmail || 'Not Provided',
            'Student Email': student.email,
            'Course': student.course || 'Computer Science and Engineering'
          });
        } else {
          // Calculate overall attendance across all subjects
          for (const subj of subjects) {
            const subjRecords = studentAttendance.filter(record => record.subject === subj);
            totalClasses += subjRecords.length;
            totalPresent += subjRecords.filter(record => record.status === 'present').length;
          }
          
          const overallPercentage = totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100) : 0;
          exportData.push({
            'Roll No': student.rollNo,
            'Student Name': student.name,
            'Division': student.division,
            'Subject': 'ALL SUBJECTS',
            'Total Classes': totalClasses,
            'Classes Attended': totalPresent,
            'Classes Missed': totalClasses - totalPresent,
            'Attendance %': overallPercentage,
            'Status': overallPercentage < threshold ? 'DEFAULTER' : 'REGULAR',
            'Parent Email': student.parentEmail || 'Not Provided',
            'Student Email': student.email,
            'Course': student.course || 'Computer Science and Engineering'
          });
        }
      }
    }
    
    // Create workbook with multiple sheets
    const wb = xlsx.utils.book_new();
    
    // Main attendance sheet
    const ws = xlsx.utils.json_to_sheet(exportData);
    
    // Apply conditional formatting for defaulters if colorCode is enabled
    if (colorCode === 'true') {
      const range = xlsx.utils.decode_range(ws['!ref']);
      
      // Add conditional formatting for defaulters
      for (let row = 1; row <= range.e.r; row++) { // Start from 1 to skip header
        const statusCell = ws[xlsx.utils.encode_cell({ r: row, c: 9 })]; // Status column (index 9)
        
        if (statusCell && statusCell.v === 'DEFAULTER') {
          // Apply red styling to the entire row
          for (let col = 0; col <= range.e.c; col++) {
            const cellRef = xlsx.utils.encode_cell({ r: row, c: col });
            if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
            
            // Set cell style for red highlighting
            ws[cellRef].s = {
              fill: { fgColor: { rgb: 'FFCCCC' } }, // Light red background
              font: { color: { rgb: 'CC0000' }, bold: true }, // Dark red bold text
              border: {
                top: { style: 'thin', color: { rgb: 'CC0000' } },
                bottom: { style: 'thin', color: { rgb: 'CC0000' } },
                left: { style: 'thin', color: { rgb: 'CC0000' } },
                right: { style: 'thin', color: { rgb: 'CC0000' } }
              }
            };
          }
        }
      }
    }
    
    // Set column widths for better readability
    ws['!cols'] = [
      { wch: 10 }, // Roll No
      { wch: 25 }, // Student Name
      { wch: 10 }, // Division
      { wch: 30 }, // Subject
      { wch: 12 }, // Total Classes
      { wch: 15 }, // Classes Attended
      { wch: 13 }, // Classes Missed
      { wch: 12 }, // Attendance %
      { wch: 12 }, // Status
      { wch: 30 }, // Parent Email
      { wch: 30 }, // Student Email
      { wch: 35 }  // Course
    ];
    
    xlsx.utils.book_append_sheet(wb, ws, 'Attendance Report');
    
    // Create summary sheet for defaulters
    const defaulters = exportData.filter(row => row.Status === 'DEFAULTER');
    if (defaulters.length > 0) {
      const defaulterSummary = defaulters.map(row => ({
        'Roll No': row['Roll No'],
        'Student Name': row['Student Name'],
        'Division': row['Division'],
        'Subject': row['Subject'],
        'Attendance %': row['Attendance %'],
        'Parent Email': row['Parent Email'],
        'Student Email': row['Student Email'],
        'Action Required': 'Send Alert Email',
        'Notes': 'Requires immediate attention'
      }));
      
      const wsDefaulters = xlsx.utils.json_to_sheet(defaulterSummary);
      
      // Style defaulters sheet header
      wsDefaulters['!cols'] = [
        { wch: 10 }, { wch: 25 }, { wch: 10 }, { wch: 30 }, 
        { wch: 12 }, { wch: 30 }, { wch: 30 }, { wch: 20 }, { wch: 25 }
      ];
      
      xlsx.utils.book_append_sheet(wb, wsDefaulters, 'Defaulters Alert');
    }
    
    // Create statistics summary sheet
    const stats = {
      'Total Students': students.length,
      'Students with Records': exportData.filter(row => row.Status !== 'NO DATA').length,
      'Regular Students': exportData.filter(row => row.Status === 'REGULAR').length,
      'Defaulters': defaulters.length,
      'Students with No Data': exportData.filter(row => row.Status === 'NO DATA').length,
      'Export Date': new Date().toLocaleString(),
      'Filters Applied': JSON.stringify({ startDate, endDate, subject, division })
    };
    
    const statsData = Object.entries(stats).map(([key, value]) => ({ Metric: key, Value: value }));
    const wsStats = xlsx.utils.json_to_sheet(statsData);
    wsStats['!cols'] = [{ wch: 25 }, { wch: 40 }];
    xlsx.utils.book_append_sheet(wb, wsStats, 'Summary Statistics');
    
    // Generate buffer
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    // Create descriptive filename
    const today = new Date().toISOString().split('T')[0];
    let filename = `attendance-comprehensive-${today}`;
    if (subject) filename += `-${subject.replace(/\s+/g, '-')}`;
    if (division) filename += `-Div${division}`;
    if (startDate && endDate) filename += `-${startDate}-to-${endDate}`;
    filename += '.xlsx';
    
    console.log(`Export completed: ${exportData.length} records, ${defaulters.length} defaulters`);
    
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
    
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
