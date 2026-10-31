# 🤖 AI-Powered Chatbot for CSE Attendance System

## 🌟 Overview

An intelligent chatbot that extracts and queries data from teacher-uploaded materials (syllabus, notes, timetables, PYQs) and provides personalized attendance information to students.

---

## ✨ Key Features

### 📄 Document Intelligence
- **Automatic Text Extraction** from PDFs, Word docs, images, and text files
- **OCR Support** for scanned documents and images
- **Multi-format Processing** with specialized libraries
- **Background Processing** for non-blocking uploads

### 🧠 AI-Powered Responses
- **RAG (Retrieval Augmented Generation)** for accurate answers
- **Context-Aware** responses based on actual uploaded content
- **Google Gemini AI** integration for natural language understanding
- **Source Attribution** in responses

### 📊 Attendance Integration
- **Real-time Statistics** - percentage, present/absent counts
- **Recent History** - last 5-10 attendance records
- **Personalized Insights** - recommendations and warnings
- **Subject-wise Breakdown** - attendance per course

### 🔍 Smart Search
- **Keyword Matching** across all materials
- **Type Detection** - automatically identifies material type
- **Relevance Ranking** - returns most relevant results
- **Fast Retrieval** - indexed database queries

---

## 🚀 Quick Start

### 1. Start the System
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

### 2. Upload Materials (Teacher)
- Login as teacher
- Navigate to "Upload Material"
- Select file and fill metadata
- Upload → Text extraction happens automatically

### 3. Query Chatbot (Student)
- Login as student
- Click chat icon (bottom-right)
- Ask questions about materials or attendance
- Get intelligent, context-aware responses

---

## 💬 Example Queries

### About Materials
```
"What topics are in the Data Structures syllabus?"
"Explain binary search from the notes"
"When is the Database class?"
"What questions were asked in last year's exam?"
```

### About Attendance
```
"What's my attendance percentage?"
"How many classes have I missed?"
"Show my recent attendance"
"Am I at risk of low attendance?"
```

### Study Help
```
"What should I study for the exam?"
"Which subjects need more attention?"
"Explain pointers from the notes"
"Compare BFS and DFS"
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    STUDENT INTERFACE                     │
│  • Chat window with message history                     │
│  • Real-time responses                                   │
│  • Loading indicators                                    │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                   CHATBOT API LAYER                      │
│  • Query analysis                                        │
│  • Material search                                       │
│  • Attendance retrieval                                  │
│  • Context building                                      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                   GOOGLE GEMINI AI                       │
│  • Natural language processing                           │
│  • Context-aware generation                              │
│  • Intelligent responses                                 │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    MONGODB DATABASE                      │
│  • Materials with extracted text                         │
│  • Attendance records                                    │
│  • User information                                      │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 Technology Stack

### Backend
- **Express.js** - REST API framework
- **Mongoose** - MongoDB ODM
- **Multer** - File upload handling
- **pdf-parse** - PDF text extraction
- **mammoth** - Word document processing
- **tesseract.js** - OCR for images
- **@google/generative-ai** - Gemini AI SDK

### Frontend
- **React** - UI framework
- **Axios** - HTTP client
- **Lucide Icons** - Icon library
- **Tailwind CSS** - Styling

### Database
- **MongoDB Atlas** - Cloud database
- **Text Indexing** - Full-text search capability

### AI
- **Google Gemini AI** - Language model
- **RAG Pattern** - Retrieval Augmented Generation

---

## 📁 Project Structure

```
AUTOMATED--ATTENDANCE-TRACKER-AND-AI-POWERED-LEARNING/
│
├── backend/
│   ├── models/
│   │   └── Material.js          # Enhanced with text extraction fields
│   ├── routes/
│   │   ├── chatbotRoutes.js     # AI chatbot logic with RAG
│   │   └── materialRoutes.js    # Material upload with extraction
│   ├── utils/
│   │   └── extractText.js       # Text extraction utilities
│   ├── test-extraction.js       # Testing script
│   └── server.js                # Main server file
│
├── src/
│   ├── components/
│   │   └── Student/
│   │       └── Chatbot.jsx      # Enhanced chatbot UI
│   └── services/
│       └── api.js               # API client with userId support
│
├── Documentation/
│   ├── AI_CHATBOT_README.md     # Feature documentation
│   ├── SETUP_GUIDE.md           # Detailed setup instructions
│   ├── ARCHITECTURE.md          # System architecture
│   ├── EXAMPLE_QUERIES.md       # Query examples
│   ├── QUICK_START.md           # Quick reference
│   └── IMPLEMENTATION_SUMMARY.md # This implementation summary
│
└── .env                         # Environment variables
```

---

## 🔧 Configuration

### Environment Variables (.env)
```env
MONGODB_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=your_jwt_secret
PORT=5000
```

### Supported File Formats
- **PDF** (.pdf) - Full text extraction
- **Word** (.doc, .docx) - Complete content
- **Text** (.txt) - Direct reading
- **Images** (.jpg, .png) - OCR extraction
- **PowerPoint** (.ppt, .pptx) - Basic support

### File Size Limits
- Maximum upload size: **10MB**
- Recommended: **< 5MB** for faster processing

---

## 🎯 How It Works

### 1. Material Upload Flow
```
Teacher uploads file
    ↓
File saved to disk (/uploads/materials/)
    ↓
Material document created in MongoDB
    ↓
Text extraction triggered (async)
    ↓
Extracted text stored in database
    ↓
Material now searchable by chatbot
```

### 2. Query Processing Flow
```
Student asks question
    ↓
System analyzes query keywords
    ↓
Searches relevant materials in database
    ↓
Fetches attendance data (if needed)
    ↓
Builds context with retrieved information
    ↓
Sends to Gemini AI with context
    ↓
AI generates intelligent response
    ↓
Response returned to student
```

### 3. RAG Implementation
```
Retrieval: Search MongoDB for relevant materials
    ↓
Augmentation: Add material content to AI prompt
    ↓
Generation: Gemini AI creates contextual response
```

---

## 📊 Performance

### Text Extraction Speed
| File Type | Size | Time |
|-----------|------|------|
| PDF | 10 pages | 2-5 sec |
| Word | 5 pages | 1-3 sec |
| Text | Any | <1 sec |
| Image | 1 page | 5-15 sec |

### Query Response Time
| Query Type | Time |
|------------|------|
| Simple | 1-2 sec |
| With search | 2-4 sec |
| With attendance | 2-3 sec |
| Complex | 3-5 sec |

---

## 🔒 Security

### Authentication
- JWT token validation
- User session management
- Role-based access control

### Data Privacy
- Attendance data only for logged-in student
- Materials accessible to enrolled students
- No sensitive data in chat logs

### File Upload Security
- File type validation
- Size limits enforced
- Sanitized filenames
- Secure storage path

---

## 🙏 Acknowledgments

### Technologies Used
- Google Gemini AI for intelligent responses
- MongoDB for flexible data storage
- React for modern UI
- Express.js for robust backend

### Libraries
- pdf-parse for PDF extraction
- mammoth for Word processing
- tesseract.js for OCR
- multer for file uploads

---


## ✅ Success Checklist

- [x] Text extraction implemented
- [x] Material search functional
- [x] Attendance integration complete
- [x] AI responses working
- [x] Error handling robust
- [x] Documentation comprehensive
- [x] Testing scripts provided
- [x] Examples documented

---

## 🎉 Ready to Use!

Your AI chatbot is fully functional and ready to help students with:
- ✅ Syllabus queries
- ✅ Notes explanations
- ✅ Timetable information
- ✅ PYQ insights
- ✅ Attendance tracking
- ✅ Study recommendations

**Start the servers and begin learning! 📚🤖**

---

**Version:** 1.0.0  
**Last Updated:** 2024  
**Status:** ✅ Production Ready
#   A t t e n d a n c e - T r a c k e r - a n d - A I - A c a d e m i c - A s s i s t a n t  
 