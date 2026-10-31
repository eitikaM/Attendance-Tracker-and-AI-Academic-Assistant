import React, { useState } from 'react';
import { api } from '../../services/api';

function AnnouncementsForm({ announcement, onSuccess }) {
  const [title, setTitle] = useState(announcement?.title || '');
  const [type, setType] = useState(announcement?.type || 'General');
  const [message, setMessage] = useState(announcement?.message || '');
  const [date, setDate] = useState(announcement?.date ? new Date(announcement.date).toISOString().split('T')[0] : '');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccess('');
    setError('');
    try {
      if (announcement) {
        // Update existing announcement
        await api.put(`/announcements/${announcement.id}`, { title, type, message, date: date || undefined });
        setSuccess('Announcement updated successfully.');
      } else {
        // Create new announcement
        await api.createAnnouncement({ title, type, message, date: date || undefined });
        setSuccess('Announcement posted successfully.');
      }
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        setTimeout(() => onSuccess(), 1000);
      } else {
        // Reset form only if not in edit mode
        if (!announcement) {
          setTitle('');
          setType('General');
          setMessage('');
          setDate('');
        }
      }
    } catch (err) {
      setError(err?.response?.data?.message || `Failed to ${announcement ? 'update' : 'post'} announcement`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-semibold mb-4">{announcement ? 'Edit Announcement' : 'Post Announcement'}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter title" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select className="input-field" value={type} onChange={(e) => setType(e.target.value)}>
            <option>General</option>
            <option>Seminar</option>
            <option>Exam</option>
            <option>Notice</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input type="date" className="input-field" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
          <textarea className="input-field" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write the announcement message" required />
        </div>

        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? (announcement ? 'Updating...' : 'Posting...') : (announcement ? 'Update Announcement' : 'Post Announcement')}
        </button>

        {success && <p className="text-green-600 text-sm mt-2">{success}</p>}
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      </form>
    </div>
  );
}

export default AnnouncementsForm;


