import React, { useState, useEffect } from 'react';
import { Upload, Download, FileText, Trash2, Eye } from 'lucide-react';
import { api } from '../../services/api';

const MaterialUpload = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'notes',
    subject: '',
    semester: ''
  });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upload');

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const response = await api.get('/materials');
      if (response.data.success) {
        setMaterials(response.data.materials || []);
      }
    } catch (error) {
      console.error('Failed to fetch materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      alert('Please select a file');
      return;
    }

    setUploading(true);
    try {
      const data = new FormData();
      data.append('file', file);
      Object.keys(formData).forEach(key => {
        data.append(key, formData[key]);
      });

      await api.post('/materials/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert('File uploaded successfully!');
      // Reset form
      setFormData({ title: '', description: '', type: 'notes', subject: '', semester: '' });
      setFile(null);
      fetchMaterials(); // Refresh the materials list
    } catch (error) {
      alert('Upload failed: ' + (error.response?.data?.error || error.message));
    }
    setUploading(false);
  };

  const handleDownload = async (materialId, filename) => {
    try {
      const response = await api.get(`/materials/download/${materialId}`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Download failed: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDelete = async (materialId, title) => {
    if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
      try {
        await api.delete(`/materials/${materialId}`);
        alert('Material deleted successfully');
        fetchMaterials();
      } catch (error) {
        alert('Delete failed: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Upload className="w-6 h-6" />
          Study Materials Management
        </h2>
        <p className="text-gray-600">Upload and manage syllabus, notes, timetables, and previous year questions</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'upload'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Upload Material
        </button>
        <button
          onClick={() => setActiveTab('manage')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'manage'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Manage Materials ({materials.length})
        </button>
      </div>

      {activeTab === 'upload' && (
        <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Material Type</label>
            <select 
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value})}
              className="input-field"
              required
            >
              <option value="syllabus">Syllabus</option>
              <option value="notes">Notes</option>
              <option value="timetable">Timetable</option>
              <option value="pyqs">Previous Year Questions</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="input-field"
              rows="3"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Semester *</label>
              <select
                value={formData.semester}
                onChange={(e) => setFormData({...formData, semester: e.target.value})}
                className="input-field"
                required
              >
                <option value="">Select Semester</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                  <option key={sem} value={sem}>Semester {sem}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">File *</label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              className="input-field"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.png"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              Supported formats: PDF, DOC, PPT, TXT, JPG, PNG (Max 10MB)
            </p>
          </div>

          <button
            type="submit"
            disabled={uploading}
            className="btn-primary flex items-center"
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? 'Uploading...' : 'Upload Material'}
          </button>
        </form>
        </div>
      )}

      {activeTab === 'manage' && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Uploaded Materials
          </h3>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="loading-spinner"></div>
            </div>
          ) : materials.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No materials uploaded yet</p>
              <button
                onClick={() => setActiveTab('upload')}
                className="mt-2 text-blue-600 hover:text-blue-800"
              >
                Upload your first material
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {materials.map((material) => (
                <div key={material._id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <h4 className="font-medium text-gray-900">{material.title}</h4>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {material.type}
                        </span>
                      </div>
                      
                      {material.description && (
                        <p className="text-sm text-gray-600 mb-2">{material.description}</p>
                      )}
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Subject: {material.subject}</span>
                        <span>Semester: {material.semester}</span>
                        <span>Uploaded: {new Date(material.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleDownload(material._id, material.filename || material.title)}
                        className="btn-secondary inline-flex items-center text-sm"
                        title="Download"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </button>
                      
                      <button
                        onClick={() => handleDelete(material._id, material.title)}
                        className="text-red-600 hover:text-red-800 inline-flex items-center px-2 py-1 text-xs border border-red-300 rounded hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MaterialUpload;


