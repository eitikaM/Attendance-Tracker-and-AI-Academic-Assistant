import React from 'react';
import { Calendar, Check, X } from 'lucide-react';

function AttendanceHistory({ attendance }) {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Attendance</h3>
      <div className="space-y-3">
        {attendance.slice(0, 10).map((record) => (
          <div key={record._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 text-gray-400 mr-3" />
              <span className="text-sm font-medium text-gray-700">
                {formatDate(record.date)}
              </span>
            </div>
            <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              record.status === 'present' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {record.status === 'present' ? (
                <Check className="h-4 w-4 mr-1" />
              ) : (
                <X className="h-4 w-4 mr-1" />
              )}
              {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
            </div>
          </div>
        ))}
        
        {attendance.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No attendance records found</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AttendanceHistory;