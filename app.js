const express = require('express');
const cors = require('cors');
const uploadRoutes = require('./routes/uploadRoutes'); // 👈 import the route

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images statically
app.use('/uploads', express.static('uploads'));

// Use the upload route
app.use('/api/upload', uploadRoutes); // 👈 connect the route

module.exports = app;
