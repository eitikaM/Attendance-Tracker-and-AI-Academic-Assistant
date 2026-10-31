import React, { useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, X } from 'lucide-react';
import { api } from '../../services/api';

function BulkStudentUpload({ onUploadComplete }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv'
      ];
      
      if (allowedTypes.includes(selectedFile.type)) {
        setFile(selectedFile);
        setError('');
        setResults(null);
      } else {
        setError('Please select an Excel file (.xlsx, .xls) or CSV file');
        setFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('studentFile', file);

      const response = await api.post('/students/bulk-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setResults(response.data.results);
        setFile(null);
        if (onUploadComplete) {
          onUploadComplete();
        }
      } else {
        setError(response.data.message || 'Upload failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    // Create a sample Excel template matching the format shown in the image
    const templateData = [
      {
        'Sr. No': '1',
        'Roll No': '1',
        'Division': 'I',
        'PRN': '234110001',
        'Student Name': 'AYUSH ADITYA',
        'MF': 'M',
        'Mobile No': '7051022064',
        'Email Id': 'ayush@student.bvpuni.edu.in',
        'Branch Allotted': 'Computer Science and Engineering',
        'Campus': 'Pune',
        'parent email': 'parent@gmail.com'
      },
      {
        'Sr. No': '2',
        'Roll No': '2',
        'Division': 'I',
        'PRN': '234110002',
        'Student Name': 'MANAN AGARWAL',
        'MF': 'M',
        'Mobile No': '9205588152',
        'Email Id': 'manan.agarwal@student.bvpuni.edu.in',
        'Branch Allotted': 'Computer Science and Engineering',
        'Campus': 'Pune',
        'parent email': 'parent2@gmail.com'
      }
    ];

    const csvContent = [
      'Sr. No,Roll No,Division,PRN,Student Name,MF,Mobile No,Email Id,Branch Allotted,Campus,parent email',
      ...templateData.map(row => 
        `${row['Sr. No']},${row['Roll No']},${row.Division},${row.PRN},"${row['Student Name']}",${row.MF},${row['Mobile No']},${row['Email Id']},"${row['Branch Allotted']}",${row.Campus},${row['parent email']}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student-bulk-upload-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-2xl">
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <FileSpreadsheet className="h-5 w-5 mr-2" />
          Bulk Student Upload
        </h3>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
          <h4 className="font-medium text-blue-900 mb-2">Instructions:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Upload an Excel (.xlsx, .xls) or CSV file with student data</li>
            <li>• Required columns: PRN, Student Name, Email Id, Roll No</li>
            <li>• Optional columns: Division, MF (Gender), Mobile No, Branch Allotted, Campus, parent email</li>
            <li>• Use the exact column headers as shown in the template</li>
            <li>• Existing students (by PRN/Roll No) will be updated, new ones will be created</li>
          </ul>
          <button
            onClick={downloadTemplate}
            className="mt-3 text-blue-600 hover:text-blue-800 text-sm underline flex items-center"
          >
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            Download Template File
          </button>
        </div>

        {/* File Upload */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select File
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            {file && (
              <p className="mt-2 text-sm text-gray-600">
                Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="btn-primary flex items-center"
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? 'Uploading...' : 'Upload Students'}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Results Display */}
        {results && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex items-center mb-3">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <h4 className="font-medium text-green-900">Upload Complete!</h4>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{results.created}</div>
                <div className="text-gray-600">Created</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{results.updated}</div>
                <div className="text-gray-600">Updated</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{results.errors?.length || 0}</div>
                <div className="text-gray-600">Errors</div>
              </div>
            </div>

            {results.errors && results.errors.length > 0 && (
              <div className="mt-4">
                <h5 className="font-medium text-red-900 mb-2">Errors:</h5>
                <div className="max-h-32 overflow-y-auto">
                  {results.errors.map((error, index) => (
                    <div key={index} className="text-sm text-red-700 mb-1">
                      • {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default BulkStudentUpload;
