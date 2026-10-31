import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Calendar, Clock, User, AlertCircle, BookOpen, GraduationCap, FileText, Megaphone } from 'lucide-react';

function AnnouncementsList() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchAnnouncements();
  }, [filter]);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.getAnnouncements();
      
      if (response.data.success) {
        let filteredAnnouncements = response.data.announcements;
        
        // Filter by type if not 'all'
        if (filter !== 'all') {
          filteredAnnouncements = filteredAnnouncements.filter(
            announcement => announcement.type === filter
          );
        }
        
        setAnnouncements(filteredAnnouncements);
      } else {
        setError('Failed to fetch announcements');
      }
    } catch (err) {
      console.error('Error fetching announcements:', err);
      setError(err?.response?.data?.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Exam':
        return <GraduationCap className="h-5 w-5 text-red-500" />;
      case 'Seminar':
        return <BookOpen className="h-5 w-5 text-blue-500" />;
      case 'Notice':
        return <FileText className="h-5 w-5 text-yellow-500" />;
      default:
        return <Megaphone className="h-5 w-5 text-gray-500" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'Exam':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Seminar':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Notice':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Announcements</h2>
        
        {/* Filter Dropdown */}
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Filter by type:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input-field w-auto"
          >
            <option value="all">All Types</option>
            <option value="General">General</option>
            <option value="Exam">Exam</option>
            <option value="Seminar">Seminar</option>
            <option value="Notice">Notice</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {announcements.length === 0 ? (
        <div className="text-center py-12">
          <Megaphone className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Announcements</h3>
          <p className="text-gray-500">
            {filter === 'all' 
              ? 'There are no announcements at the moment.' 
              : `No ${filter.toLowerCase()} announcements found.`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {announcements.map((announcement) => (
            <div
              key={announcement.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="p-6 pb-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    {getTypeIcon(announcement.type)}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {announcement.title}
                      </h3>
                      <div className="flex items-center space-x-4 mt-1">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTypeColor(announcement.type)}`}
                        >
                          {announcement.type}
                        </span>
                        <div className="flex items-center text-sm text-gray-500">
                          <User className="h-4 w-4 mr-1" />
                          {announcement.createdBy?.name || 'Unknown'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right text-sm text-gray-500">
                    <div className="flex items-center mb-1">
                      <Calendar className="h-4 w-4 mr-1" />
                      {formatDate(announcement.date)}
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {formatTime(announcement.createdAt)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 pb-6">
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {announcement.message}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Department: {announcement.department}</span>
                  <span>Posted: {formatDate(announcement.createdAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Refresh Button */}
      <div className="mt-8 text-center">
        <button
          onClick={fetchAnnouncements}
          disabled={loading}
          className="btn-secondary"
        >
          {loading ? 'Refreshing...' : 'Refresh Announcements'}
        </button>
      </div>
    </div>
  );
}

export default AnnouncementsList;
