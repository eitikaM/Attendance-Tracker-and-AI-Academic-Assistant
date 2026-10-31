import React, { useState, useEffect } from 'react';
import { Download, Calendar, Filter, FileSpreadsheet } from 'lucide-react';
import { api } from '../../services/api';

function AttendanceExport() {
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    subject: '',
    division: ''
  });
  const [subjects, setSubjects] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const response = await api.getSubjects();
      if (response.data.success) {
        setSubjects(response.data.subjects || []);
      }
    } catch (err) {
      console.error('Failed to fetch subjects:', err);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleExport = async () => {
    setExporting(true);
    setError('');

    try {
      // Build query parameters
      const params = new URLSearchParams();
      
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.subject) params.append('subject', filters.subject);
      if (filters.division) params.append('division', filters.division);
      
      // Add parameter for color coding defaulters
      params.append('colorCode', 'true');
      params.append('defaulterThreshold', '75');

      // Make request to export endpoint
      const response = await fetch(`http://localhost:5000/api/attendance/export?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Export failed');
      }

      // Get the blob and create download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Create filename with current date and filters
      const today = new Date().toISOString().split('T')[0];
      let filename = `attendance-export-${today}`;
      if (filters.subject) filename += `-${filters.subject.replace(/\s+/g, '-')}`;
      if (filters.division) filename += `-Div${filters.division}`;
      filename += '.xlsx';
      
      // Create download link
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

    } catch (err) {
      setError('Failed to export attendance data. Please try again.');
      console.error('Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      subject: '',
      division: ''
    });
  };

  return (
    <div className="max-w-2xl">
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <FileSpreadsheet className="h-5 w-5 mr-2" />
          Export Attendance Data
        </h3>

        {/* Filters */}
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                className="input-field"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                className="input-field"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Subject Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject
              </label>
              <select
                className="input-field"
                value={filters.subject}
                onChange={(e) => handleFilterChange('subject', e.target.value)}
              >
                <option value="">All Subjects</option>
                {subjects.map((subject) => (
                  <option key={subject._id || subject.name} value={subject.name}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Division Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Division
              </label>
              <select
                className="input-field"
                value={filters.division}
                onChange={(e) => handleFilterChange('division', e.target.value)}
              >
                <option value="">All Divisions</option>
                <option value="I">Division I</option>
                <option value="II">Division II</option>
              </select>
            </div>
          </div>
        </div>

        {/* Export Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
          <h4 className="font-medium text-blue-900 mb-2">Export Details:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Excel file with comprehensive attendance data</li>
            <li>• Student names, subjects, and attendance percentages</li>
            <li>• <span className="font-semibold text-red-600">Red highlighting</span> for defaulters (attendance &lt; 75%)</li>
            <li>• Includes parent email information for communication</li>
            <li>• Ready for printing and sharing with administration</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="btn-primary flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            {exporting ? 'Generating Excel...' : 'Export with Color Coding'}
          </button>

          <button
            onClick={clearFilters}
            className="btn-secondary flex items-center"
          >
            <Filter className="h-4 w-4 mr-2" />
            Clear Filters
          </button>
        </div>

        {/* Export Preview */}
        <div className="mt-4 p-3 bg-gray-50 rounded-md">
          <h5 className="text-sm font-medium text-gray-700 mb-2">Export will include:</h5>
          <div className="text-xs text-gray-600 space-y-1">
            <div>• Student Name, Subject, Attendance Percentage</div>
            <div>• <span className="bg-red-100 text-red-800 px-1 rounded">Red highlighting</span> for students with &lt;75% attendance</div>
            <div>• Parent email addresses for follow-up communication</div>
          </div>
        </div>

        {/* Applied Filters Display */}
        {(filters.startDate || filters.endDate || filters.subject || filters.division) && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <h5 className="text-sm font-medium text-gray-700 mb-2">Applied Filters:</h5>
            <div className="flex flex-wrap gap-2">
              {filters.startDate && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  From: {filters.startDate}
                </span>
              )}
              {filters.endDate && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  To: {filters.endDate}
                </span>
              )}
              {filters.subject && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Subject: {filters.subject}
                </span>
              )}
              {filters.division && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Division: {filters.division}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AttendanceExport;
