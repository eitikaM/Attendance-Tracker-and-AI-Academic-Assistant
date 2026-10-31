import React, { useState, useEffect } from 'react';
import { Search, Download, BookOpen, Calendar, FileText, Archive } from 'lucide-react';
import { api } from '../../services/api';

const MaterialsLibrary = () => {
  const [materials, setMaterials] = useState([]);
  const [filteredMaterials, setFilteredMaterials] = useState([]);
  const [filters, setFilters] = useState({
    type: '',
    subject: '',
    semester: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMaterials();
  }, []);

  useEffect(() => {
    filterMaterials();
  }, [materials, filters, searchTerm]);

  const fetchMaterials = async () => {
    try {
      const response = await api.get('/materials');
      if (response.data.success) {
        setMaterials(response.data.materials || []);
      } else {
        console.error('Failed to fetch materials:', response.data.error);
        setMaterials([]);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching materials:', error);
      setMaterials([]);
      setLoading(false);
    }
  };

  const filterMaterials = () => {
    let filtered = materials.filter(material => {
      const matchesType = !filters.type || material.type === filters.type;
      const matchesSubject = !filters.subject || 
        material.subject.toLowerCase().includes(filters.subject.toLowerCase());
      const matchesSemester = !filters.semester || material.semester == filters.semester;
      const matchesSearch = !searchTerm || 
        material.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.description.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesType && matchesSubject && matchesSemester && matchesSearch;
    });

    setFilteredMaterials(filtered);
  };

  const downloadFile = async (materialId, filename) => {
    try {
      console.log(`Attempting to download material: ${materialId} - ${filename}`);
      
      const response = await api.get(`/materials/download/${materialId}`, {
        responseType: 'blob'
      });
      
      // Check if response is actually a blob (successful download)
      if (response.data instanceof Blob && response.data.size > 0) {
        const url = window.URL.createObjectURL(response.data);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename || 'download');
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        console.log('Download completed successfully');
      } else {
        throw new Error('Invalid file response');
      }
    } catch (error) {
      console.error('Download failed:', error);
      
      // Handle different types of errors
      let errorMessage = 'Download failed. Please try again.';
      
      if (error.response) {
        if (error.response.status === 404) {
          errorMessage = 'File not found on server.';
        } else if (error.response.data && error.response.data.error) {
          errorMessage = error.response.data.error;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'syllabus': return <BookOpen className="w-5 h-5" />;
      case 'timetable': return <Calendar className="w-5 h-5" />;
      case 'pyqs': return <Archive className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'syllabus': return 'bg-purple-100 text-purple-800';
      case 'notes': return 'bg-blue-100 text-blue-800';
      case 'timetable': return 'bg-green-100 text-green-800';
      case 'pyqs': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Study Materials Library</h2>
          <p className="text-gray-600">Browse and download study materials</p>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Study Materials Library</h2>
        <p className="text-gray-600">Browse and download study materials</p>
      </div>

      {/* Search and Filters */}
      <div className="card p-4">
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search materials by title or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select 
            value={filters.type}
            onChange={(e) => setFilters({...filters, type: e.target.value})}
            className="input-field"
          >
            <option value="">All Types</option>
            <option value="syllabus">Syllabus</option>
            <option value="notes">Notes</option>
            <option value="timetable">Timetable</option>
            <option value="pyqs">PYQs</option>
          </select>

          <input
            type="text"
            placeholder="Filter by subject"
            value={filters.subject}
            onChange={(e) => setFilters({...filters, subject: e.target.value})}
            className="input-field"
          />

          <select
            value={filters.semester}
            onChange={(e) => setFilters({...filters, semester: e.target.value})}
            className="input-field"
          >
            <option value="">All Semesters</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
              <option key={sem} value={sem}>Semester {sem}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Materials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMaterials.map(material => (
          <div key={material._id} className="card hover:shadow-md transition-shadow">
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-full ${getTypeColor(material.type)}`}>
                  {getIcon(material.type)}
                </div>
                <div>
                  <span className={`text-xs font-medium px-2 py-1 rounded capitalize ${getTypeColor(material.type)}`}>
                    {material.type}
                  </span>
                </div>
              </div>

              <h3 className="font-semibold mb-2 text-lg">{material.title}</h3>
              <p className="text-gray-600 text-sm mb-3">{material.description}</p>

              <div className="flex justify-between items-center text-sm text-gray-500 mb-3">
                <span>Sem {material.semester}</span>
                <span>{material.subject}</span>
              </div>

              <div className="text-xs text-gray-400 mb-3">
                Uploaded on: {new Date(material.uploadDate).toLocaleDateString()}
              </div>

              <button
                onClick={() => downloadFile(material._id, material.originalName || material.filename || material.title)}
                className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-2 rounded hover:bg-green-700 transition-colors"
                title={`Download ${material.title}`}
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredMaterials.length === 0 && materials.length > 0 && (
        <div className="text-center py-12 text-gray-500">
          No materials found matching your criteria
        </div>
      )}

      {materials.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No materials available yet. Check back later!
        </div>
      )}
    </div>
  );
};

export default MaterialsLibrary;


