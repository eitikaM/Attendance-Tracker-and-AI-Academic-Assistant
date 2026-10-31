import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import StudentList from '../components/Teacher/StudentList';
import AttendanceMarking from '../components/Teacher/AttendanceMarking';
import AttendanceRecords from '../components/Teacher/AttendanceRecords';
import MaterialUpload from '../components/Teacher/MaterialUpload';
import AttendanceExport from '../components/Teacher/AttendanceExport';
import { Users, Calendar, BarChart3, Upload, LogOut, Megaphone, Download } from 'lucide-react';
import AnnouncementsManager from '../components/Teacher/AnnouncementsManager';
import bvpLogo from './bvp.png';

function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState('attendance');
  const { user, logout } = useAuth();
  const tabs = [
    { id: 'attendance', name: 'Mark Attendance', icon: Calendar },
    { id: 'students', name: 'Student Management', icon: Users },
    { id: 'records', name: 'Attendance Records', icon: BarChart3 },
    { id: 'materials', name: 'Upload Materials', icon: Upload },
    { id: 'announcements', name: 'Announcements', icon: Megaphone },
    { id: 'export', name: 'Export Data', icon: Download },
  ];

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
                <p className="text-sm text-gray-500">Teacher Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, <strong>{user?.name}</strong>
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {activeTab === 'students' && <StudentList />}
          {activeTab === 'attendance' && <AttendanceMarking />}
          {activeTab === 'records' && <AttendanceRecords />}
          {activeTab === 'materials' && <MaterialUpload />}
          {activeTab === 'announcements' && <AnnouncementsManager />}
          {activeTab === 'export' && <AttendanceExport />}
        </div>
      </main>
    </div>
  );
}

export default TeacherDashboard;