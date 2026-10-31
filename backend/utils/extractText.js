const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const Tesseract = require('tesseract.js');

/**
 * Extract text from various file formats
 * @param {string} filePath - Path to the file
 * @param {string} fileType - File extension (.pdf, .docx, .txt, .jpg, .png)
 * @returns {Promise<string>} - Extracted text content
 */
async function extractText(filePath, fileType) {
  try {
    const ext = fileType.toLowerCase();

    switch (ext) {
      case '.pdf':
        return await extractFromPDF(filePath);

      case '.doc':
      case '.docx':
        return await extractFromWord(filePath);

      case '.txt':
        return await extractFromText(filePath);

      case '.jpg':
      case '.jpeg':
      case '.png':
        return await extractFromImage(filePath);

      case '.ppt':
      case '.pptx':
        // PPT extraction is complex, return placeholder for now
        return 'PowerPoint content extraction - Please refer to the original file for detailed content.';

      default:
        throw new Error(`Unsupported file type: ${ext}`);
    }
  } catch (error) {
    console.error('Error extracting text:', error);
    throw error;
  }
}

/**
 * Extract text from PDF files
 */
async function extractFromPDF(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Extract text from Word documents
 */
async function extractFromWord(filePath) {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    console.error('Word extraction error:', error);
    throw new Error('Failed to extract text from Word document');
  }
}

/**
 * Extract text from plain text files
 */
async function extractFromText(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error('Text file reading error:', error);
    throw new Error('Failed to read text file');
  }
}

/**
 * Extract text from images using OCR
 */
async function extractFromImage(filePath) {
  try {
    const { data: { text } } = await Tesseract.recognize(filePath, 'eng', {
      logger: info => console.log(info)
    });
    return text;
  } catch (error) {
    console.error('Image OCR error:', error);
    throw new Error('Failed to extract text from image');
  }
}

/**
 * Clean and normalize extracted text
 */
function cleanText(text) {
  if (!text) return '';

  return text
    .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
    .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
    .trim();
}

module.exports = {
  extractText,
  cleanText
};