/**
 * Test script to check available Gemini models
 * Run with: node test-gemini.js
 */

require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
  console.log('🧪 Testing Gemini AI Configuration\n');
  
  // Check API key
  if (!process.env.GEMINI_API_KEY) {
    console.log('❌ No GEMINI_API_KEY found in .env file');
    return;
  }
  
  console.log('✅ API Key found:', process.env.GEMINI_API_KEY.substring(0, 10) + '...');
  
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log('✅ GoogleGenerativeAI initialized\n');
    
    // List available models
    console.log('📋 Attempting to list available models...');
    try {
      const models = await genAI.listModels();
      console.log('✅ Available models:');
      for await (const model of models) {
        console.log(`   - ${model.name}`);
        console.log(`     Supported methods: ${model.supportedGenerationMethods.join(', ')}`);
      }
    } catch (listError) {
      console.log('⚠️  Could not list models:', listError.message);
    }
    
    console.log('\n🧪 Testing different model names...\n');
    
    // Test different model names (newest first)
    const modelsToTest = [
      'gemini-2.0-flash-exp',
      'gemini-exp-1206',
      'gemini-1.5-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.5-pro',
      'gemini-1.5-pro-latest',
      'gemini-pro',
      'models/gemini-2.0-flash-exp',
      'models/gemini-1.5-flash',
      'models/gemini-1.5-pro',
      'models/gemini-pro'
    ];
    
    for (const modelName of modelsToTest) {
      try {
        console.log(`Testing: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Say hello');
        const response = result.response;
        const text = response.text();
        console.log(`✅ ${modelName} works!`);
        console.log(`   Response: ${text.substring(0, 50)}...\n`);

        // If we found a working model, we can stop
        console.log(`\n🎉 Success! Use this model name: "${modelName}"\n`);
        break;
      } catch (error) {
        console.log(`❌ ${modelName} failed: ${error.message}\n`);
      }
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    console.log('\nFull error:', error);
  }
}

testGemini();

