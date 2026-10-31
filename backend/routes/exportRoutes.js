const express = require('express');
const xlsx = require('xlsx');
const mongoose = require('mongoose');
const router = express.Router();

// Attendance Export Route
router.get('/attendance/export', async (req, res) => {
  try {
    const { startDate, endDate, subject, division } = req.query;
    
    // Get models
    const Attendance = mongoose.model('Attendance');
    const User = mongoose.model('User');

    // Build query
    const attendanceQuery = {};
    const studentQuery = { role: 'student' };

    if (startDate || endDate) {
      attendanceQuery.date = {};
      if (startDate) {
        attendanceQuery.date.$gte = new Date(startDate);
      }
      if (endDate) {
        attendanceQuery.date.$lte = new Date(endDate);
      }
    }

    if (subject) {
      attendanceQuery.subject = subject;
    }

    if (division) {
      studentQuery.division = division;
    }

    // Fetch data
    const [attendanceRecords, students] = await Promise.all([
      Attendance.find(attendanceQuery).populate('studentId', 'name rollNo email division parentEmail'),
      User.find(studentQuery)
    ]);

    // Create Excel workbook
    const workbook = xlsx.utils.book_new();

    // Prepare attendance data for Excel
    const attendanceData = attendanceRecords.map(record => ({
      'Date': record.date.toLocaleDateString(),
      'Roll No': record.studentId?.rollNo || 'N/A',
      'Student Name': record.studentId?.name || 'N/A',
      'Division': record.studentId?.division || 'N/A',
      'Subject': record.subject || 'N/A',
      'Status': record.status,
      'Email': record.studentId?.email || 'N/A',
      'Parent Email': record.studentId?.parentEmail || 'N/A'
    }));

    // Create attendance worksheet
    const attendanceWS = xlsx.utils.json_to_sheet(attendanceData);
    xlsx.utils.book_append_sheet(workbook, attendanceWS, 'Attendance Records');

    // Create summary worksheet
    const summaryData = students.map(student => {
      const studentAttendance = attendanceRecords.filter(
        record => record.studentId?._id.toString() === student._id.toString()
      );
      
      const totalClasses = studentAttendance.length;
      const presentClasses = studentAttendance.filter(record => record.status === 'present').length;
      const percentage = totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 100) : 0;

      return {
        'Roll No': student.rollNo,
        'Student Name': student.name,
        'Division': student.division,
        'Email': student.email,
        'Parent Email': student.parentEmail || 'N/A',
        'Total Classes': totalClasses,
        'Present': presentClasses,
        'Absent': totalClasses - presentClasses,
        'Attendance %': percentage
      };
    });

    const summaryWS = xlsx.utils.json_to_sheet(summaryData);
    xlsx.utils.book_append_sheet(workbook, summaryWS, 'Attendance Summary');

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `attendance-export-${timestamp}.xlsx`;

    // Write to buffer
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set response headers
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    res.send(buffer);

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export attendance data',
      error: error.message
    });
  }
});

module.exports = router;
