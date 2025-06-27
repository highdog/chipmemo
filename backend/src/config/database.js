const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/notepad');

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Ensure text indexes are created
    await ensureIndexes();
    
  } catch (error) {
    console.error('Database connection error:', error.message);
    process.exit(1);
  }
};

const ensureIndexes = async () => {
  try {
    const Note = require('../models/Note');
    
    // Ensure text index exists for search functionality
    await Note.collection.createIndex(
      { title: 'text', content: 'text' },
      { 
        name: 'text_search_index',
        default_language: 'none', // Support multiple languages including Chinese
        weights: { title: 10, content: 1 } // Give title higher weight in search
      }
    );
    
    console.log('Text search indexes ensured');
  } catch (error) {
    console.log('Index creation info:', error.message);
  }
};

module.exports = connectDB;