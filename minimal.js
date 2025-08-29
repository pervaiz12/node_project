require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Basic middleware
app.use(express.json());
app.use(cors());

// Simple test route
app.get('/', (req, res) => {
  res.json({ message: 'Server is running' });
});

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/budget-tracker';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Transaction Model
const transactionSchema = new mongoose.Schema({
  description: {
    type: String,
    required: [true, 'Please add a description'],
    trim: true,
    maxlength: [100, 'Description cannot be more than 100 characters']
  },
  amount: {
    type: Number,
    required: [true, 'Please add a positive or negative number'],
  },
  category: {
    type: String,
    required: [true, 'Please add a category'],
    trim: true
  },
  type: {
    type: String,
    required: [true, 'Please specify income or expense'],
    enum: ['income', 'expense']
  },
  date: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const Transaction = mongoose.model('Transaction', transactionSchema);

// Transaction Routes
// Get all transactions
app.get('/api/transactions', async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ date: -1 });
    res.json(transactions);
  } catch (err) {
    console.error('Error fetching transactions:', err.message);
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// Add new transaction
app.post('/api/transactions', async (req, res) => {
  try {
    const { description, amount, category, type } = req.body;
    
    const newTransaction = new Transaction({
      description,
      amount,
      category,
      type
    });

    const transaction = await newTransaction.save();
    res.status(201).json(transaction);
  } catch (err) {
    console.error('Error creating transaction:', err.message);
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API Endpoints:`);
  console.log(`- GET  /api/transactions - Get all transactions`);
  console.log(`- POST /api/transactions - Add a new transaction`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});
