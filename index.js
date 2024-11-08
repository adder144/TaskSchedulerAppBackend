// app.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./src/Routes/auth'); // Import authentication routes
const apiRoutes = require('./src/Routes'); 

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect('mongodb://localhost:27017/taskScheduler', {
})
.then(() => console.log('MongoDB connected'))
.catch((error) => console.error('MongoDB connection error:', error));


app.use('/auth', authRoutes); // Use authentication routes
app.use('/api', apiRoutes);

app.listen(5000);
