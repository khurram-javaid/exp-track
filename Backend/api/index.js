require('dotenv').config();
const mongoose = require('mongoose');
const app = require('../app.js');

// Connect to MongoDB on every serverless invocation
mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000
});

module.exports = app;
