import React from 'react';

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="loading-spinner mx-auto mb-4"></div>
        <p className="text-gray-600">Loading CSE Attendance System...</p>
      </div>
    </div>
  );
}

export default LoadingSpinner;