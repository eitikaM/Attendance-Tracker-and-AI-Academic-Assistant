import React, { useState, useEffect } from 'react';
import { Calendar, Check, X, Save, Users } from 'lucide-react';
import { api } from '../../services/api';

function AttendanceMarking() {
  const [students, setStudents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState({});
  const [division, setDivision] = useState('I');
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [subject, setSubject] = useState('');

  useEffect(() => {
    fetchStudents();
  }, [division]);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await api.getStudents({ division });
      if (response.data.success) {
        setStudents(response.data.students);
        
        // Initialize all as present (Greedy approach)
        const initialAttendance = {};
        response.data.students.forEach(student => {
          initialAttendance[student._id] = 'present';
        });
        setAttendance(initialAttendance);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await api.getSubjects();
      if (res.data.success) setSubjects(res.data.subjects);
    } catch (e) {
      // ignore
    }
  };

  // Greedy approach: mark all present/absent with one click
  const markAll = (status) => {
    const newAttendance = {};
    students.forEach(student => {
      newAttendance[student._id] = status;
    });
    setAttendance(newAttendance);
  };

  const handleStatusChange = (studentId, status) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const submitAttendance = async () => {
    setLoading(true);
    try {
      const attendanceData = Object.entries(attendance).map(([studentId, status]) => ({
        studentId,
        status
      }));

      await api.markAttendance({
        date: selectedDate,
        attendanceData,
        subject
      });

      alert(`Attendance marked successfully for ${selectedDate}!`);
    } catch (error) {
      alert('Error marking attendance: ' + error.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  const divisionStudents = students.filter(student => student.division === division);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Mark Attendance</h2>
        <p className="text-gray-600">Record daily attendance for students</p>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="date"
              className="input-field pl-10"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
          <select
            className="input-field"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          >
            <option value="">Select Subject</option>
            {subjects.map(s => (
              <option key={s._id} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Division</label>
          <select 
            className="input-field"
            value={division}
            onChange={(e) => setDivision(e.target.value)}
          >
            <option value="I">Division I</option>
            <option value="II">Division II</option>
          </select>
        </div>
        
        <div className="flex space-x-2 items-end">
          <button 
            onClick={() => markAll('present')}
            className="btn-primary flex-1 flex items-center justify-center text-sm"
          >
            <Check className="h-4 w-4 mr-1" />
            Mark All Present
          </button>
        </div>
        
        <div className="flex space-x-2 items-end">
          <button 
            onClick={() => markAll('absent')}
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg flex-1 flex items-center justify-center text-sm"
          >
            <X className="h-4 w-4 mr-1" />
            Mark All Absent
          </button>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Users className="h-5 w-5 text-gray-400 mr-2" />
              <span className="text-sm font-medium text-gray-700">
                Division {division} - {divisionStudents.length} students
              </span>
            </div>
            <span className="text-sm text-gray-500">{selectedDate}</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header px-6 py-3">Roll No</th>
                <th className="table-header px-6 py-3">Student Name</th>
                <th className="table-header px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {divisionStudents.map((student) => (
                <tr key={student._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {student.rollNo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {student.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleStatusChange(student._id, 'present')}
                        className={`px-3 py-1 rounded text-sm font-medium ${
                          attendance[student._id] === 'present'
                            ? 'bg-green-100 text-green-800 border border-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Present
                      </button>
                      <button
                        onClick={() => handleStatusChange(student._id, 'absent')}
                        className={`px-3 py-1 rounded text-sm font-medium ${
                          attendance[student._id] === 'absent'
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Absent
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          onClick={submitAttendance}
          disabled={loading}
          className="btn-primary flex items-center"
        >
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Saving...' : `Save Attendance for ${selectedDate}`}
        </button>
      </div>
    </div>
  );
}

export default AttendanceMarking;