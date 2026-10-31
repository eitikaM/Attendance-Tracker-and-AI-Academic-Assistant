/**
 * Test script for text extraction functionality
 * Run with: node test-extraction.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const { extractText, cleanText } = require('./utils/extractText');

// Test the extraction with a sample file
async function testExtraction() {
  console.log('🧪 Testing Text Extraction Functionality\n');
  
  // Test 1: PDF Extraction (if you have a test PDF)
  console.log('Test 1: PDF Extraction');
  try {
    const testPdfPath = path.join(__dirname, 'test-files', 'sample.pdf');
    // Uncomment if you have a test PDF file
    // const pdfText = await extractText(testPdfPath, '.pdf');
    // console.log('✅ PDF extraction successful');
    // console.log('Preview:', cleanText(pdfText).substring(0, 200));
    console.log('⏭️  Skipped (no test file)');
  } catch (error) {
    console.log('❌ PDF extraction failed:', error.message);
  }
  console.log('');
  
  // Test 2: Text File Extraction
  console.log('Test 2: Text File Extraction');
  try {
    const fs = require('fs');
    const testDir = path.join(__dirname, 'test-files');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    const testTxtPath = path.join(testDir, 'sample.txt');
    fs.writeFileSync(testTxtPath, 'This is a test document for text extraction.\nIt contains multiple lines.\nTesting complete!');
    
    const txtText = await extractText(testTxtPath, '.txt');
    console.log('✅ Text file extraction successful');
    console.log('Content:', cleanText(txtText));
  } catch (error) {
    console.log('❌ Text file extraction failed:', error.message);
  }
  console.log('');
  
  // Test 3: Database Connection and Material Check
  console.log('Test 3: Database Connection');
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected successfully');
    
    const Material = require('./models/Material');
    const totalMaterials = await Material.countDocuments();
    const extractedMaterials = await Material.countDocuments({ textExtracted: true });
    const pendingMaterials = await Material.countDocuments({ textExtracted: false });
    
    console.log(`📊 Materials Statistics:`);
    console.log(`   Total Materials: ${totalMaterials}`);
    console.log(`   Extracted: ${extractedMaterials}`);
    console.log(`   Pending: ${pendingMaterials}`);
    
    if (pendingMaterials > 0) {
      console.log('\n💡 Tip: Run POST /api/materials/extract-all to process pending materials');
    }
    
    await mongoose.connection.close();
  } catch (error) {
    console.log('❌ Database test failed:', error.message);
  }
  console.log('');
  
  console.log('🎉 Testing Complete!\n');
}

// Run the test
testExtraction().catch(console.error);

