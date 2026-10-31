import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

// Create axios instances for different endpoints
export const authAPI = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

export const studentAPI = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

export const attendanceAPI = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

// Request interceptors for adding auth tokens if needed
authAPI.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptors for error handling
const setupResponseInterceptors = (apiInstance) => {
  apiInstance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );
};

setupResponseInterceptors(authAPI);
setupResponseInterceptors(studentAPI);
setupResponseInterceptors(attendanceAPI);

// Create a general API instance for materials and chatbot
export const materialsAPI = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

// Add auth token to materials API
materialsAPI.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

setupResponseInterceptors(materialsAPI);

// General API for announcements as well
export const announcementsAPI = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

announcementsAPI.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

setupResponseInterceptors(announcementsAPI);

export const api = {
  // Auth
  login: (credentials) => authAPI.post('/auth/login', credentials),
  getSubjects: () => authAPI.get('/subjects'),
  
  // Students
  getStudents: (params = {}) => studentAPI.get('/students', { params }),
  addStudent: (studentData) => studentAPI.post('/students', studentData),
  updateParentEmail: (studentId, parentEmail) => studentAPI.put(`/students/${studentId}/parent-email`, { parentEmail }),
  deleteStudent: (studentId) => studentAPI.delete(`/students/${studentId}`),
  
  // Attendance
  markAttendance: (attendanceData) => attendanceAPI.post('/attendance/mark', attendanceData),
  getAttendanceRecords: (params = {}) => attendanceAPI.get('/attendance/records', { params }),
  getAttendanceStats: (studentId, params = {}) => attendanceAPI.get(`/attendance/stats/${studentId}`, { params }),
  sendAttendanceAlert: (payload) => attendanceAPI.post('/attendance/alert', payload),
  
  // Materials
  post: (url, data, config) => materialsAPI.post(url, data, config),
  get: (url, config) => materialsAPI.get(url, config),
  put: (url, data, config) => materialsAPI.put(url, data, config),
  delete: (url, config) => materialsAPI.delete(url, config),
  
  // Chatbot
  chat: (message, sessionId, userId) => materialsAPI.post('/chatbot/chat', { message, sessionId, userId }),

  // Announcements
  createAnnouncement: (data) => announcementsAPI.post('/announcements', data),
  getAnnouncements: () => announcementsAPI.get('/announcements'),
  updateAnnouncement: (id, data) => announcementsAPI.put(`/announcements/${id}`, data),
  deleteAnnouncement: (id) => announcementsAPI.delete(`/announcements/${id}`),
};