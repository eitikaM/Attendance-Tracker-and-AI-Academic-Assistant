import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AttendanceChart from '../components/Student/AttendanceChart';
import AttendanceHistory from '../components/Student/AttendanceHistory';
import MaterialsLibrary from '../components/Student/MaterialsLibrary';
import Chatbot from '../components/Student/Chatbot';
import { User, Calendar, Percent, BookOpen, LogOut, Megaphone } from 'lucide-react';
import AnnouncementsList from '../components/Student/AnnouncementsList';
import { api } from '../services/api';
import bvpLogo from './bvp.png';

function StudentDashboard() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('attendance');
  const [subjects, setSubjects] = useState([]);
  const [subject, setSubject] = useState('');

  useEffect(() => {
    fetchStudentData();
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (user) fetchStudentData();
  }, [subject]);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      const [statsResponse, attendanceResponse] = await Promise.all([
        api.getAttendanceStats(user.id, subject ? { subject } : {}),
        api.getAttendanceRecords({ studentId: user.id, ...(subject ? { subject } : {}) })
      ]);

      if (statsResponse.data.success) {
        setStats(statsResponse.data.stats);
      }
      if (attendanceResponse.data.success) {
        setAttendance(attendanceResponse.data.attendance);
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await api.getSubjects();
      if (res.data.success) setSubjects(res.data.subjects);
    } catch (e) {}
  }

  const tabs = [
    { id: 'attendance', name: 'Attendance', icon: Calendar },
    { id: 'materials', name: 'Study Materials', icon: BookOpen },
    { id: 'announcements', name: 'Announcements', icon: Megaphone },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img src={bvpLogo} alt="BVP Logo" className="h-8 w-8 mr-3" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  CSE Attendance System
                </h1>
                <p className="text-sm text-gray-500">Student Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {user?.name} (Roll No: {user?.rollNo})
              </span>
              <button
                onClick={logout}
                className="flex items-center text-sm text-gray-500 hover:text-gray-700"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-cse-blue text-cse-blue'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Filters for Attendance Tab */}
      {activeTab === 'attendance' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <select className="input-field" value={subject} onChange={(e) => setSubject(e.target.value)}>
                <option value="">All Subjects</option>
                {subjects.map(s => <option key={s._id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'attendance' && (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Total Days */}
              <div className="card p-6">
                <div className="flex items-center">
                  <Calendar className="h-8 w-8 text-blue-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Days</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats?.totalDays || 0}
                    </p>
                  </div>
                </div>
              </div>

              {/* Present Days */}
              <div className="card p-6">
                <div className="flex items-center">
                  <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <Calendar className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Present Days</p>
                    <p className="text-2xl font-bold text-green-600">
                      {stats?.presentDays || 0}
                    </p>
                  </div>
                </div>
              </div>

              {/* Attendance Percentage */}
              <div className="card p-6">
                <div className="flex items-center">
                  <Percent className="h-8 w-8 text-purple-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Attendance %</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {stats?.percentage || 0}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts and History */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <AttendanceChart stats={stats} />
              <AttendanceHistory attendance={attendance} />
            </div>
          </>
        )}

        {activeTab === 'materials' && <MaterialsLibrary />}
        {activeTab === 'announcements' && <AnnouncementsList />}
      </div>

      {/* Chatbot */}
      <Chatbot />
    </div>
  );
}

export default StudentDashboard;