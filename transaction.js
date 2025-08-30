
const express = require('express');
const router = express.Router();
const Transaction = require('./models/Transaction');

// @route   GET /
// @desc    Get all transactions
// @access  Public
router.get('/', async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ date: -1 });
    res.json(transactions);
  } catch (err) {
    console.error('Error fetching transactions:', err.message);
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// @route   POST /
// @desc    Add a new transaction
// @access  Public
router.post('/', async (req, res) => {
  try {
    const { description, amount, category, type } = req.body;
    console.log(req.body);
    console.log("......");

    const newTransaction = new Transaction({
      description,
      amount,
      category,
      type
    });

    const transaction = await newTransaction.save();
    res.json(transaction);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT /:id
// @desc    Update a transaction
// @access  Public
router.put('/:id', async (req, res) => {
  try {
    const { description, amount, category, type } = req.body;

    const update = {};
    if (description !== undefined) update.description = description;
    if (amount !== undefined) update.amount = amount;
    if (category !== undefined) update.category = category;
    if (type !== undefined) update.type = type;

    const transaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!transaction) {
      return res.status(404).json({ msg: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (err) {
    console.error('Error updating transaction:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Transaction not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   DELETE /api/transactions/:id
// @desc    Delete a transaction
// @access  Public
router.delete('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ msg: 'Transaction not found' });
    }

    await transaction.deleteOne(); 
    res.json({ msg: 'Transaction removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Transaction not found' });
    }
    res.status(500).send('Server Error');
  }
});


module.exports = router;