import React, { useEffect, useState, useMemo } from 'react';
import { Calendar, Search } from 'lucide-react';
import { api } from '../../services/api';

function AttendanceRecords() {
  const [records, setRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    studentId: '',
    course: '',
    from: '',
    to: ''
  });

  useEffect(() => {
    fetchInitial();
  }, []);

  const fetchInitial = async () => {
    try {
      setLoading(true);
      const [studentsRes, recordsRes] = await Promise.all([
        api.getStudents(),
        api.getAttendanceRecords(),
      ]);
      if (studentsRes.data.success) setStudents(studentsRes.data.students);
      if (recordsRes.data.success) setRecords(recordsRes.data.attendance);
    } catch (err) {
      console.error('Error loading attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  // Hash map for quick student lookup
  const studentById = useMemo(() => {
    const map = {};
    students.forEach(s => { map[s._id] = s });
    return map;
  }, [students]);

  const filtered = records.filter(r => {
    const s = studentById[r.studentId] || {};
    const inStudent = !filters.studentId || r.studentId === filters.studentId;
    const inCourse = !filters.course || s.course === filters.course;
    const dateOnly = new Date(r.date).toISOString().split('T')[0];
    const inFrom = !filters.from || dateOnly >= filters.from;
    const inTo = !filters.to || dateOnly <= filters.to;
    return inStudent && inCourse && inFrom && inTo;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="loading-spinner" />
      </div>
    )
  }

  const courses = Array.from(new Set(students.map(s => s.course).filter(Boolean)));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Attendance Records</h2>
        <p className="text-gray-600">Review attendance across dates and filters</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <select
            className="input-field pl-10"
            value={filters.studentId}
            onChange={(e) => setFilters({ ...filters, studentId: e.target.value })}
          >
            <option value="">All Students</option>
            {students.map(s => (
              <option key={s._id} value={s._id}>{s.rollNo} - {s.name}</option>
            ))}
          </select>
        </div>

        <select
          className="input-field"
          value={filters.course}
          onChange={(e) => setFilters({ ...filters, course: e.target.value })}
        >
          <option value="">All Courses</option>
          {courses.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="date"
            className="input-field pl-10"
            value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
          />
        </div>

        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="date"
            className="input-field pl-10"
            value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header px-6 py-3">Date</th>
                <th className="table-header px-6 py-3">Roll No</th>
                <th className="table-header px-6 py-3">Name</th>
                <th className="table-header px-6 py-3">Course</th>
                <th className="table-header px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.map((r) => {
                const s = studentById[r.studentId] || {};
                return (
                  <tr key={r._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {new Date(r.date).toISOString().split('T')[0]}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{s.rollNo}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{s.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{s.course}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${r.status === 'present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AttendanceRecords;













