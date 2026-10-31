import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, SortAsc, BarChart3, Upload, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import BulkStudentUpload from './Teacher/BulkStudentUpload';

function StudentList() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('');
  const [sortBy, setSortBy] = useState('rollNo');
  const [sortDir, setSortDir] = useState('desc'); // 'asc' | 'desc'

  // Attendance stats per student
  const [statsByStudent, setStatsByStudent] = useState({});
  const [statsLoading, setStatsLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editParentEmail, setEditParentEmail] = useState('');

  // Subject-wise analytics
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    rollNo: '',
    division: 'I',
    parentEmail: ''
  });

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await api.getSubjects();
        if (res.data?.success) setSubjects(res.data.subjects || []);
      } catch (e) {
        // ignore
      }
    };
    fetchSubjects();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await api.getStudents();
      if (response.data.success) {
        setStudents(response.data.students);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch attendance stats for all students (used for sorting and analytics)
  useEffect(() => {
    const loadStats = async () => {
      if (!students.length) return;
      setStatsLoading(true);
      try {
        const results = await Promise.all(
          students.map(async (s) => {
            try {
              const res = await api.getAttendanceStats(
                s._id,
                selectedSubject ? { subject: selectedSubject } : {}
              );
              if (res.data?.success) {
                return [s._id, res.data.stats];
              }
            } catch (e) {
              // ignore individual errors
            }
            return [s._id, { totalDays: 0, presentDays: 0, absentDays: 0, percentage: 0 }];
          })
        );
        const map = {};
        results.forEach(([id, stats]) => { map[id] = stats; });
        setStatsByStudent(map);
      } finally {
        setStatsLoading(false);
      }
    };
    loadStats();
  }, [students, selectedSubject]);

  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      await api.addStudent(formData);
      setFormData({ name: '', email: '', rollNo: '', division: 'I', parentEmail: '' });
      fetchStudents(); // Refresh the list
    } catch (error) {
      alert('Error adding student: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteStudent = async (studentId, studentName) => {
    if (window.confirm(`Are you sure you want to delete ${studentName}? This action cannot be undone.`)) {
      try {
        await api.deleteStudent(studentId);
        fetchStudents(); // Refresh the list
        alert('Student deleted successfully');
      } catch (error) {
        alert('Error deleting student: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  // Efficient search and filtering with hashing for quick lookups
  const filteredStudents = students
    .filter(student => {
      const matchesSearch = 
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.rollNo.includes(searchTerm) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDivision = !divisionFilter || student.division === divisionFilter;
      
      return matchesSearch && matchesDivision;
    })
    .sort((a, b) => {
      // Efficient sorting based on selected field
      let compare = 0;
      if (sortBy === 'name') {
        compare = a.name.localeCompare(b.name);
      } else if (sortBy === 'rollNo') {
        compare = a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true });
      } else if (sortBy === 'attendance') {
        const pa = statsByStudent[a._id]?.percentage ?? -1;
        const pb = statsByStudent[b._id]?.percentage ?? -1;
        compare = (pa === pb) ? 0 : (pa > pb ? 1 : -1);
      }
      return sortDir === 'asc' ? compare : -compare;
    });

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Student Management</h2>
          <p className="text-gray-600">Manage CSE department students</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowBulkUpload(true)}
            className="btn-secondary flex items-center"
          >
            <Upload className="h-4 w-4 mr-2" />
            Bulk Upload
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-primary flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Student
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search by name, roll no, or email"
            className="input-field pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <select 
          className="input-field"
          value={divisionFilter}
          onChange={(e) => setDivisionFilter(e.target.value)}
        >
          <option value="">All Divisions</option>
          <option value="I">Division I</option>
          <option value="II">Division II</option>
        </select>

        <select
          className="input-field"
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
        >
          <option value="">All Subjects</option>
          {subjects.map((s) => (
            <option key={s._id || s.name} value={s.name}>{s.name}</option>
          ))}
        </select>
        
        <select 
          className="input-field"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="rollNo">Sort by Roll No</option>
          <option value="name">Sort by Name</option>
          <option value="attendance">Sort by Attendance %</option>
        </select>
        
        <div className="flex items-center justify-between text-sm text-gray-500">
          <button
            type="button"
            className="btn-secondary px-3 py-2 mr-3 flex items-center"
            onClick={() => setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')}
            title={`Toggle sort direction (${sortDir})`}
          >
            <SortAsc className={`h-4 w-4 mr-2 ${sortDir === 'asc' ? '' : 'transform rotate-180'}`} />
            {sortDir === 'asc' ? 'Ascending' : 'Descending'}
          </button>
          <div className="flex items-center">
            <Filter className="h-4 w-4 mr-1" />
            Showing {filteredStudents.length} of {students.length} students
          </div>
        </div>
      </div>

      {/* Add Student Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Add New Student</h3>
            <form onSubmit={handleAddStudent} className="space-y-4">
              <input
                type="text"
                placeholder="Full Name"
                className="input-field"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <input
                type="email"
                placeholder="Email"
                className="input-field"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Roll Number"
                className="input-field"
                value={formData.rollNo}
                onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })}
                required
              />
              <select 
                className="input-field"
                value={formData.division}
                onChange={(e) => setFormData({ ...formData, division: e.target.value })}
              >
                <option value="I">Division I</option>
                <option value="II">Division II</option>
              </select>
              <input
                type="email"
                placeholder="Parent's Email"
                className="input-field"
                value={formData.parentEmail}
                onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
              />
              <div className="flex space-x-3">
                <button type="submit" className="btn-primary flex-1">
                  Add Student
                </button>
                <button 
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Bulk Student Upload</h3>
                <button
                  onClick={() => setShowBulkUpload(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              <BulkStudentUpload 
                onUploadComplete={() => {
                  setShowBulkUpload(false);
                  fetchStudents(); // Refresh the student list
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Students Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header px-6 py-3">Roll No</th>
                <th className="table-header px-6 py-3">Name</th>
                <th className="table-header px-6 py-3">Email</th>
                <th className="table-header px-6 py-3">Division</th>
                <th className="table-header px-6 py-3">Course</th>
                <th className="table-header px-6 py-3">Parent Email</th>
                <th className="table-header px-6 py-3">Attendance %</th>
                <th className="table-header px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStudents.map((student) => (
                <tr key={student._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {student.rollNo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {student.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    Division {student.division}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.course}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center space-x-2">
                      <span>{student.parentEmail || '-'}</span>
                      <button
                        type="button"
                        className="text-cse-blue text-xs underline"
                        onClick={() => { setSelectedStudent({ ...student, mode: 'edit-parent' }); setEditParentEmail(student.parentEmail || ''); }}
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {statsLoading && !(statsByStudent[student._id]) ? '…' : (statsByStudent[student._id]?.percentage ?? 0)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <button type="button" onClick={() => setSelectedStudent(student)} className="btn-secondary inline-flex items-center">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Analytics
                    </button>
                    {((statsByStudent[student._id]?.percentage ?? 0) < 75) && (
                      <button
                        type="button"
                        className="btn-primary inline-flex"
                        onClick={async () => {
                          try {
                            const res = await api.sendAttendanceAlert({ studentId: student._id });
                            alert('Alert sent successfully');
                          } catch (e) {
                            alert('Failed to send alert');
                          }
                        }}
                      >
                        Send Alert
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteStudent(student._id, student.name)}
                      className="text-red-600 hover:text-red-800 inline-flex items-center px-2 py-1 text-xs border border-red-300 rounded hover:bg-red-50"
                      title="Delete Student"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Analytics Modal */}
      {selectedStudent && !selectedStudent.mode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Attendance Analytics</h3>
              <button className="btn-secondary" onClick={() => setSelectedStudent(null)}>Close</button>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-gray-600">{selectedStudent.name} • {selectedStudent.rollNo}</div>
              <div>
                <label className="text-xs text-gray-500">Subject</label>
                <select
                  className="input-field mt-1"
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                >
                  <option value="">All Subjects</option>
                  {subjects.map((s) => (
                    <option key={s._id || s.name} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-gray-50 rounded">
                  <div className="text-xs text-gray-500">Total Classes</div>
                  <div className="text-xl font-semibold">{statsByStudent[selectedStudent._id]?.totalDays ?? 0}</div>
                </div>
                <div className="p-3 bg-green-50 rounded">
                  <div className="text-xs text-green-600">Present</div>
                  <div className="text-xl font-semibold text-green-700">{statsByStudent[selectedStudent._id]?.presentDays ?? 0}</div>
                </div>
                <div className="p-3 bg-red-50 rounded">
                  <div className="text-xs text-red-600">Absent</div>
                  <div className="text-xl font-semibold text-red-700">{statsByStudent[selectedStudent._id]?.absentDays ?? 0}</div>
                </div>
              </div>
              <div className="mt-4">
                <div className="text-sm text-gray-600 mb-1">Attendance Percentage{selectedSubject ? ` • ${selectedSubject}` : ''}</div>
                <div className="w-full bg-gray-200 rounded h-2">
                  <div
                    className="bg-cse-blue h-2 rounded"
                    style={{ width: `${statsByStudent[selectedStudent._id]?.percentage ?? 0}%` }}
                  />
                </div>
                <div className="text-right text-sm mt-1 font-medium">{statsByStudent[selectedStudent._id]?.percentage ?? 0}%</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedStudent && selectedStudent.mode === 'edit-parent' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Update Parent Email</h3>
              <button className="btn-secondary" onClick={() => setSelectedStudent(null)}>Close</button>
            </div>
            <div className="space-y-3">
              <div className="text-sm text-gray-600">{selectedStudent.name} • {selectedStudent.rollNo}</div>
              <input
                type="email"
                className="input-field"
                value={editParentEmail}
                onChange={(e) => setEditParentEmail(e.target.value)}
                placeholder="Parent's Email"
              />
              <button
                className="btn-primary"
                onClick={async () => {
                  try {
                    await api.updateParentEmail(selectedStudent._id, editParentEmail);
                    setSelectedStudent(null);
                    fetchStudents();
                    alert('Saved');
                  } catch (e) {
                    alert('Failed to save');
                  }
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentList;