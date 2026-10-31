const express = require('express');
const router = express.Router();
const Material = require('../models/Material');
const mongoose = require('mongoose');

// Initialize Gemini AI
let genAI = null;
let chatSessions = new Map();
let geminiInitError = null;

try {
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY.trim());
    console.log('✅ Gemini AI initialized successfully');
    console.log('🔑 API Key (first 8 chars):', process.env.GEMINI_API_KEY.substring(0, 8) + '...');
    console.log('🤖 Model will use: gemini-2.5-flash');
  } else {
    geminiInitError = 'No GEMINI_API_KEY found in .env';
    console.log('⚠️  No GEMINI_API_KEY found in .env. Using simple chatbot mode.');
  }
} catch (error) {
  geminiInitError = error.message;
  console.log('❌ Gemini AI initialization failed:', error.message);
  genAI = null;
}

// Track quota errors temporarily (reset after 2 minutes so it retries)
let quotaErrorTime = null;
const QUOTA_RETRY_MS = 2 * 60 * 1000; // 2 minutes

// Cleanup old sessions every 30 minutes
setInterval(() => {
  const MAX_SESSION_AGE = 30 * 60 * 1000;
  const now = Date.now();
  let cleaned = 0;
  for (const [key, session] of chatSessions.entries()) {
    if (session._createdAt && now - session._createdAt > MAX_SESSION_AGE) {
      chatSessions.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) console.log(`🧹 Cleaned ${cleaned} old chat sessions`);
}, 30 * 60 * 1000);

// Simple response database for fallback
const simpleResponses = {
  'syllabus': 'You can find the syllabus in the Materials section under Syllabus category.',
  'notes': 'Study notes are available in the Materials library. Filter by subject to find relevant notes.',
  'timetable': 'Check the Timetable section in Materials for current class schedules.',
  'pyqs': 'Previous year questions are available in PYQs category in Materials.',
  'attendance': 'Check your attendance records in the Student Dashboard. You can view attendance by subject and see your overall percentage.',
  'default': 'I can help you with syllabus, notes, timetable, previous year questions, and attendance queries. Please check the Materials section or ask specific questions.'
};

// Helper: search relevant materials (including ones without extracted text)
async function searchRelevantMaterials(query) {
  try {
    const lowerQuery = query.toLowerCase();

    // Determine material type from query
    let materialType = null;
    if (lowerQuery.includes('syllabus')) materialType = 'syllabus';
    else if (lowerQuery.includes('note')) materialType = 'notes';
    else if (lowerQuery.includes('timetable') || lowerQuery.includes('schedule')) materialType = 'timetable';
    else if (lowerQuery.includes('pyq') || lowerQuery.includes('previous year') || lowerQuery.includes('question')) materialType = 'pyqs';

    // Build search filter - search ALL materials (not just textExtracted:true)
    const filter = {};
    if (materialType) filter.type = materialType;

    const queryWords = lowerQuery.split(' ').filter(w => w.length > 2);

    let materials = await Material.find(filter)
      .select('title description type subject semester extractedText textExtracted')
      .limit(10)
      .sort({ uploadDate: -1 });

    // Filter by relevance if we have query words
    if (queryWords.length > 0) {
      const relevant = materials.filter(material => {
        const searchText = `${material.title} ${material.description || ''} ${material.subject} ${material.extractedText || ''}`.toLowerCase();
        return queryWords.some(word => searchText.includes(word));
      });
      return relevant.length > 0 ? relevant : materials;
    }

    return materials;
  } catch (error) {
    console.error('Error searching materials:', error);
    return [];
  }
}

// Helper: get attendance data
async function getAttendanceContext(userId) {
  try {
    const Attendance = mongoose.model('Attendance');
    if (!userId) return null;

    const records = await Attendance.find({ studentId: userId })
      .sort({ date: -1 })
      .limit(30);

    if (records.length === 0) return null;

    const totalClasses = records.length;
    const presentCount = records.filter(r => r.status === 'present').length;
    const attendancePercentage = ((presentCount / totalClasses) * 100).toFixed(2);

    return {
      totalClasses,
      presentCount,
      absentCount: totalClasses - presentCount,
      attendancePercentage,
      recentRecords: records.slice(0, 5).map(r => ({
        date: r.date.toLocaleDateString(),
        status: r.status,
        subject: r.subject
      }))
    };
  } catch (error) {
    console.error('Error getting attendance context:', error);
    return null;
  }
}

// Build smart fallback response using real data
async function buildSmartFallback(message, userId, prefix = '') {
  const lowerMessage = (message || '').toLowerCase().trim();
  let response = prefix;

  // Handle greetings and casual messages — don't dump materials for these
  const greetings = ['hi', 'hii', 'hiii', 'hello', 'hey', 'hola', 'yo', 'sup', 'good morning', 'good afternoon', 'good evening', 'good night', 'howdy', 'whats up', "what's up", 'how are you', 'thanks', 'thank you', 'bye', 'goodbye', 'ok', 'okay', 'cool', 'nice', 'great'];
  const isGreeting = greetings.some(g => lowerMessage === g || lowerMessage === g + '!' || lowerMessage === g + '.');

  if (isGreeting) {
    const greetingResponses = [
      "👋 Hello! I'm your CSE study assistant. I can help you with:\n\n📋 **Syllabus** — Ask about any subject syllabus\n📝 **Notes** — Find study notes and materials\n📅 **Timetable** — Check class schedules\n📄 **PYQs** — Previous year question papers\n📊 **Attendance** — View your attendance records\n\nWhat would you like to know?",
      "Hey there! 👋 I'm here to help with your studies. Try asking me about syllabus, notes, timetable, PYQs, or your attendance!",
      "Hi! 😊 Welcome to the CSE Study Assistant. Ask me anything about your courses, materials, or attendance!"
    ];
    return response + greetingResponses[Math.floor(Math.random() * greetingResponses.length)];
  }

  if (lowerMessage.includes('attendance') && userId) {
    const attendanceCtx = await getAttendanceContext(userId);
    if (attendanceCtx) {
      response += `📊 Your Attendance Summary:\n\n`;
      response += `Total Classes: ${attendanceCtx.totalClasses}\n`;
      response += `Present: ${attendanceCtx.presentCount}\n`;
      response += `Absent: ${attendanceCtx.absentCount}\n`;
      response += `Attendance Percentage: ${attendanceCtx.attendancePercentage}%\n\n`;
      response += `Recent Attendance:\n`;
      attendanceCtx.recentRecords.forEach(record => {
        const emoji = record.status === 'present' ? '✅' : '❌';
        response += `${emoji} ${record.date}: ${record.status}${record.subject ? ` (${record.subject})` : ''}\n`;
      });
      return response;
    }
  }

  const materials = await searchRelevantMaterials(message || '');
  if (materials.length > 0) {
    response += `📚 Found ${materials.length} relevant material(s):\n\n`;
    materials.forEach((material, index) => {
      response += `${index + 1}. ${material.title}\n`;
      response += `   Type: ${material.type} | Subject: ${material.subject} | Semester: ${material.semester}\n`;
      if (material.description) response += `   ${material.description}\n`;
      if (material.extractedText) {
        const snippet = material.extractedText.substring(0, 200).trim();
        response += `   Preview: ${snippet}...\n`;
      }
      response += `\n`;
    });
    return response;
  }

  // Generic keyword fallback
  if (lowerMessage.includes('syllabus')) return response + simpleResponses.syllabus;
  if (lowerMessage.includes('note')) return response + simpleResponses.notes;
  if (lowerMessage.includes('time') || lowerMessage.includes('schedule')) return response + simpleResponses.timetable;
  if (lowerMessage.includes('previous') || lowerMessage.includes('pyq')) return response + simpleResponses.pyqs;
  if (lowerMessage.includes('attendance')) return response + simpleResponses.attendance;

  return response + simpleResponses.default;
}

// Helper: get AI response using Gemini
async function getGeminiResponse(sessionId, messageWithContext) {
  const MODEL_NAME = 'gemini-2.5-flash';

  if (!chatSessions.has(sessionId)) {
    console.log(`💬 New chat session: ${sessionId}`);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: `You are a knowledgeable and friendly AI assistant for CSE (Computer Science Engineering) students. Follow these rules:

1. **Use your own knowledge first**: For general questions about computer science topics (e.g., "what is mobile computing", "explain OOP", "what is DBMS"), answer thoroughly using your own expertise. Give detailed, educational explanations.
2. **Supplement with materials when provided**: If study materials or attendance data are included as context in a message, reference them as additional resources but still provide a comprehensive answer from your own knowledge.
3. **Be natural with greetings**: For casual messages like "hi", "hello", "hey", respond naturally and warmly without listing materials or data.
4. **Be concise but helpful**: Give clear, well-structured answers. Use bullet points, bold text, and examples when helpful.
5. **Stay in scope**: You help with syllabus, study notes, timetable, PYQs, attendance, and any CSE-related academic questions.
6. **Never say "I don't have information"**: If a student asks a CSE question, answer it from your knowledge. Only mention uploaded materials if they are directly relevant and were provided as context.` }],
        },
        {
          role: 'model',
          parts: [{ text: "Hello! I'm your AI study assistant for CSE. I can help you with any computer science topic — whether it's understanding concepts, reviewing syllabus, finding study notes, or checking attendance. Ask me anything!" }],
        },
      ],
    });
    chat._createdAt = Date.now();
    chatSessions.set(sessionId, chat);
  }

  const chat = chatSessions.get(sessionId);
  const result = await chat.sendMessage(messageWithContext);
  const response = await result.response;
  return response.text();
}

// ===== MAIN CHAT ENDPOINT =====
router.post('/chat', async (req, res) => {
  const { message, sessionId, userId } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, error: 'Message is required' });
  }

  console.log(`📨 Chat: "${message.substring(0, 60)}" | Session: ${sessionId}`);

  // Detect if this is a casual/greeting message — skip material search for these
  const lowerMsg = message.toLowerCase().trim();
  const greetingWords = ['hi', 'hii', 'hiii', 'hello', 'hey', 'hola', 'yo', 'sup', 'good morning', 'good afternoon', 'good evening', 'good night', 'howdy', 'whats up', "what's up", 'how are you', 'thanks', 'thank you', 'bye', 'goodbye', 'ok', 'okay', 'cool', 'nice', 'great'];
  const isCasualMessage = greetingWords.some(g => lowerMsg === g || lowerMsg === g + '!' || lowerMsg === g + '.');

  try {
    // Only search for materials if the message is an actual question (not a greeting)
    let relevantMaterials = [];
    if (!isCasualMessage) {
      relevantMaterials = await searchRelevantMaterials(message);
    }

    // Get attendance context if needed
    let attendanceContext = null;
    if (lowerMsg.includes('attendance') && userId) {
      attendanceContext = await getAttendanceContext(userId);
    }

    // ===== NO AI: Smart fallback =====
    if (!genAI) {
      console.log('⚠️ No AI available, using smart fallback.');
      const fallback = await buildSmartFallback(message, userId);
      return res.json({ response: fallback, sessionId });
    }

    // Check if quota error was recent - use fallback temporarily
    if (quotaErrorTime && (Date.now() - quotaErrorTime) < QUOTA_RETRY_MS) {
      console.log('⏳ Recent quota error, using smart fallback with materials data...');
      const materials = relevantMaterials;
      let response = '📚 Here\'s what I found in your study materials:\n\n';

      if (attendanceContext) {
        response = `📊 Your Attendance Summary:\n`;
        response += `Total: ${attendanceContext.totalClasses} | Present: ${attendanceContext.presentCount} | Absent: ${attendanceContext.absentCount}\n`;
        response += `Percentage: ${attendanceContext.attendancePercentage}%\n\n`;
        attendanceContext.recentRecords.forEach(r => {
          response += `${r.status === 'present' ? '✅' : '❌'} ${r.date}: ${r.status}${r.subject ? ` (${r.subject})` : ''}\n`;
        });
        return res.json({ response, sessionId });
      }

      if (materials.length > 0) {
        response = `📚 Found ${materials.length} material(s) for your query:\n\n`;
        materials.forEach((m, i) => {
          response += `${i + 1}. ${m.title}\n`;
          response += `   ${m.type} | Subject: ${m.subject} | Semester ${m.semester}\n`;
          if (m.description) response += `   ${m.description}\n`;
          if (m.extractedText) response += `   Preview: ${m.extractedText.substring(0, 150).trim()}...\n`;
          response += '\n';
        });
        return res.json({ response, sessionId });
      }

      const fallback = await buildSmartFallback(message, userId);
      return res.json({ response: fallback, sessionId });
    }

    // ===== AI AVAILABLE: Build context and get Gemini response =====
    let contextText = '';

    // Only include materials that have extractedText (actual content to reference)
    const materialsWithContent = relevantMaterials.filter(m => m.extractedText && m.extractedText.trim().length > 50);
    if (materialsWithContent.length > 0) {
      contextText += '\n\n--- SUPPLEMENTARY STUDY MATERIALS (use as additional reference, but answer primarily from your own knowledge) ---\n';
      materialsWithContent.slice(0, 3).forEach((material, index) => {
        contextText += `[Material ${index + 1}] ${material.title}\n`;
        contextText += `Type: ${material.type} | Subject: ${material.subject} | Semester: ${material.semester}\n`;
        if (material.description) contextText += `Description: ${material.description}\n`;
        contextText += `Content: ${material.extractedText.substring(0, 600)}...\n`;
      });
      contextText += '---\n';
    }

    if (attendanceContext) {
      contextText += `\n--- STUDENT ATTENDANCE DATA ---\n`;
      contextText += `Total Classes: ${attendanceContext.totalClasses}\n`;
      contextText += `Present: ${attendanceContext.presentCount}\n`;
      contextText += `Absent: ${attendanceContext.absentCount}\n`;
      contextText += `Percentage: ${attendanceContext.attendancePercentage}%\n`;
      contextText += `Recent: ${attendanceContext.recentRecords.map(r => `${r.date}: ${r.status}`).join(', ')}\n`;
      contextText += '---\n';
    }

    const messageWithContext = contextText
      ? `${message}\n\n[Supplementary context - answer the question from your own knowledge first, then mention these if relevant]:${contextText}`
      : message;

    console.log('🤖 Sending to Gemini AI...');
    const aiText = await getGeminiResponse(sessionId, messageWithContext);
    // Reset quota error tracking on success
    quotaErrorTime = null;
    console.log('✅ Gemini AI responded successfully');

    return res.json({ response: aiText, sessionId });

  } catch (error) {
    console.error('❌ Chatbot error:', error.message);

    // Handle quota errors - track time so we use fallback temporarily
    if (error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED') || error.message?.includes('429')) {
      quotaErrorTime = Date.now();
      console.log('⚠️ Quota exceeded — using smart fallback with real data');
      // Remove session so next request creates fresh one
      if (sessionId) chatSessions.delete(sessionId);

      try {
        const fallback = await buildSmartFallback(message, userId);
        return res.json({ response: fallback, sessionId });
      } catch (e) {
        return res.json({ response: simpleResponses.default, sessionId });
      }
    }

    // Handle invalid API key
    if (error.message?.includes('API_KEY_INVALID') || error.message?.includes('API key not valid')) {
      if (sessionId) chatSessions.delete(sessionId);
      try {
        const fallback = await buildSmartFallback(message, userId, '⚠️ AI key issue. Showing results from database:\n\n');
        return res.json({ response: fallback, sessionId });
      } catch (e) {
        return res.json({ response: '⚠️ AI service unavailable. Please check API key configuration.', sessionId });
      }
    }

    // Handle model not found
    if (error.message?.includes('MODEL') || error.message?.includes('not found') || error.message?.includes('404')) {
      if (sessionId) chatSessions.delete(sessionId);
      try {
        const fallback = await buildSmartFallback(message, userId);
        return res.json({ response: fallback, sessionId });
      } catch (e) {
        return res.json({ response: simpleResponses.default, sessionId });
      }
    }

    // Other errors - try smart fallback
    try {
      const fallback = await buildSmartFallback(message, userId);
      return res.json({ response: fallback, sessionId });
    } catch (fallbackErr) {
      return res.json({ response: simpleResponses.default, sessionId });
    }
  }
});

// ===== STATUS ENDPOINT =====
router.get('/status', (req, res) => {
  const isQuotaLimited = quotaErrorTime && (Date.now() - quotaErrorTime) < QUOTA_RETRY_MS;
  res.json({
    geminiEnabled: !!genAI,
    model: 'gemini-2.5-flash',
    activeSessions: chatSessions.size,
    apiKeyConfigured: !!process.env.GEMINI_API_KEY,
    apiKeyPrefix: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 8) + '...' : 'NOT SET',
    initError: geminiInitError,
    quotaLimited: isQuotaLimited,
    status: !genAI ? `⚠️ Fallback Mode: ${geminiInitError}`
           : isQuotaLimited ? '⚠️ Quota Limited (temporary fallback mode)'
           : '✅ AI Ready (gemini-2.5-flash)'
  });
});

// ===== LIVE GEMINI TEST ENDPOINT =====
router.get('/test', async (req, res) => {
  if (!genAI) {
    return res.json({
      success: false,
      error: 'genAI not initialized',
      reason: geminiInitError,
      hint: 'Check GEMINI_API_KEY in .env file'
    });
  }
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent('Say hello in one sentence.');
    const text = result.response.text();
    quotaErrorTime = null; // Reset quota error on success
    res.json({ success: true, response: text, model: 'gemini-2.5-flash' });
  } catch (err) {
    const isQuota = err.message?.includes('quota') || err.message?.includes('RESOURCE_EXHAUSTED') || err.message?.includes('429');
    if (isQuota) quotaErrorTime = Date.now();
    res.json({
      success: false,
      error: err.message,
      errorType: err.constructor.name,
      isQuotaError: isQuota,
      hint: isQuota
        ? '🚫 Quota exceeded! Your Google project has 0 quota for this region. To fix: Go to https://aistudio.google.com/app/apikey and generate a NEW API key from a different Google account.'
        : err.message?.includes('API_KEY_INVALID') ? 'Your API key is invalid — regenerate it from https://aistudio.google.com/app/apikey'
        : err.message?.includes('PERMISSION_DENIED') ? 'API key lacks permission to use Gemini'
        : err.message?.includes('fetch') ? 'Network error — check internet connection'
        : 'Unknown error — see error field above'
    });
  }
});

module.exports = router;
