
const express = require('express');
const router = express.Router();
const Transaction = require('./models/Transaction');
const auth = require('./middleware/auth');

// @route   GET /
// @desc    Get current user's transactions with filters
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { category, type, startDate, endDate, minAmount, maxAmount, q } = req.query;

    const query = { userId };
    if (category) query.category = category;
    if (type) query.type = type;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    if (minAmount || maxAmount) {
      query.amount = {};
      if (minAmount) query.amount.$gte = Number(minAmount);
      if (maxAmount) query.amount.$lte = Number(maxAmount);
    }
    if (q) {
      query.description = { $regex: q, $options: 'i' };
    }

    const transactions = await Transaction.find(query).sort({ date: -1 });
    res.json(transactions);
  } catch (err) {
    console.error('Error fetching transactions:', err.message);
    res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// @route   POST /
// @desc    Add a new transaction for current user
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { description, amount, category, type, date } = req.body;

    const newTransaction = new Transaction({
      userId: req.user.id,
      description,
      amount,
      category,
      type,
      date: date ? new Date(date) : undefined,
    });

    const transaction = await newTransaction.save();
    // Emit socket event to this user room
    const io = req.app.get('io');
    if (io) io.to(`user:${req.user.id}`).emit('transaction:created', transaction);
    res.json(transaction);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT /:id
// @desc    Update a user's transaction
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const { description, amount, category, type, date } = req.body;

    const update = {};
    if (description !== undefined) update.description = description;
    if (amount !== undefined) update.amount = amount;
    if (category !== undefined) update.category = category;
    if (type !== undefined) update.type = type;
    if (date !== undefined) update.date = new Date(date);

    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!transaction) {
      return res.status(404).json({ msg: 'Transaction not found' });
    }

    const io = req.app.get('io');
    if (io) io.to(`user:${req.user.id}`).emit('transaction:updated', transaction);
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
// @desc    Delete a user's transaction
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({ _id: req.params.id, userId: req.user.id });

    if (!transaction) {
      return res.status(404).json({ msg: 'Transaction not found' });
    }

    await transaction.deleteOne();
    const io = req.app.get('io');
    if (io) io.to(`user:${req.user.id}`).emit('transaction:deleted', { id: req.params.id });
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