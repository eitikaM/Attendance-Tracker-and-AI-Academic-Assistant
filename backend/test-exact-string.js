require('dotenv').config();
const mongoose = require('mongoose');

console.log('🔍 Testing with EXACT MongoDB connection string...');
console.log('===================================================');

// Use the exact string from your .env file
const connectionString = process.env.MONGODB_URI;

console.log('Connection string from .env:');
console.log(connectionString.replace(/:[^:]*@/, ':********@')); // Hide password

const testConnection = async () => {
  try {
    console.log('\n🔄 Attempting connection...');
    
    await mongoose.connect(connectionString, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 15000, // 15 seconds
    });
    
    console.log('✅ SUCCESS: Connected to MongoDB!');
    console.log('📊 Database name:', mongoose.connection.db.databaseName);
    console.log('🎉 Exact connection string works!');
    
    // Test basic operations
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📁 Collections:', collections.map(c => c.name));
    
    process.exit(0);
    
  } catch (error) {
    console.log('❌ CONNECTION FAILED:');
    console.log('Error message:', error.message);
    console.log('Error code:', error.code);
    
    if (error.message.includes('password')) {
      console.log('\n💡 Check your password in the .env file');
    }
    
    if (error.message.includes('whitelist')) {
      console.log('\n💡 Go to MongoDB Atlas → Network Access → Add IP Address → 0.0.0.0/0');
    }
    
    process.exit(1);
  }
};

testConnection();