const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

const contactRoutes = require('./routes/contact');
const reviewRoutes = require('./routes/review');

app.use('/api/contact', contactRoutes);
app.use('/api/review', reviewRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', mongo: mongoose.connection.readyState });
});

// MongoDB connect
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    const port = process.env.PORT || 8080;
    app.listen(port, () => console.log('Server running on port ' + port));
  })
  .catch(err => {
    console.error('MongoDB connection error', err);
    process.exit(1);
  });
