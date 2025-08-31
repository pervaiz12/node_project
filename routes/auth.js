const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const OtpCode = require('../models/OtpCode');
const { sendMail } = require('../utils/mailer');

const router = express.Router();

// Simple in-memory throttle: 30s cooldown per email/IP
// For distributed setups, replace with Redis or database-backed rate limiting
const THROTTLE_WINDOW_MS = 30 * 1000;
const otpThrottle = new Map(); // key -> timestamp

function throttleKey(req, email) {
  const ip = (req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip || 'unknown').trim();
  return `${email}|${ip}`.toLowerCase();
}

function signJwt(user) {
  const secret = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';
  const payload = { sub: user._id.toString(), email: user.email };
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

function setAuthCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

router.post('/request-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    // Throttle: 30s per email/IP
    const key = throttleKey(req, email);
    const now = Date.now();
    const last = otpThrottle.get(key) || 0;
    const diff = now - last;
    if (diff < THROTTLE_WINDOW_MS) {
      const waitMs = THROTTLE_WINDOW_MS - diff;
      res.setHeader('Retry-After', Math.ceil(waitMs / 1000));
      return res.status(429).json({ message: `Please wait ${Math.ceil(waitMs / 1000)}s before requesting a new code.` });
    }

    const code = ('' + Math.floor(100000 + Math.random() * 900000)); // 6 digits
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await OtpCode.deleteMany({ email }); // invalidate previous
    await OtpCode.create({ email, codeHash, expiresAt, attempts: 0 });

    const subject = 'Your Budget Tracker OTP Code';
    const html = `<p>Your OTP code is <b>${code}</b>. It expires in 10 minutes.</p>`;
    const text = `Your OTP code is ${code}. It expires in 10 minutes.`;
    await sendMail({ to: email, subject, html, text });

    // Record throttle timestamp
    otpThrottle.set(key, now);

    return res.json({ message: 'OTP sent' });
  } catch (err) {
    console.error('request-otp error', err);
    return res.status(500).json({ message: 'Failed to send OTP' });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { email, code, name } = req.body;
    if (!email || !code) return res.status(400).json({ message: 'Email and code are required' });

    const codeHash = crypto.createHash('sha256').update(String(code)).digest('hex');
    const record = await OtpCode.findOne({ email });
    if (!record) return res.status(400).json({ message: 'OTP not found, request a new one' });
    if (record.expiresAt < new Date()) return res.status(400).json({ message: 'OTP expired' });
    if (record.attempts >= 5) return res.status(400).json({ message: 'Too many attempts' });

    if (record.codeHash !== codeHash) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({ message: 'Invalid code' });
    }

    await OtpCode.deleteMany({ email });

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ email, name: name || email.split('@')[0] });
    }

    const token = signJwt(user);
    setAuthCookie(res, token);
    return res.json({ user: { id: user._id, email: user.email, name: user.name } });
  } catch (err) {
    console.error('verify-otp error', err);
    return res.status(500).json({ message: 'Verification failed' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const token = req.cookies && req.cookies.token;
    if (!token) return res.status(200).json({ user: null });
    const secret = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';
    const payload = jwt.verify(token, secret);
    const user = await User.findById(payload.sub).lean();
    if (!user) return res.status(200).json({ user: null });
    return res.json({ user: { id: user._id, email: user.email, name: user.name } });
  } catch (err) {
    return res.status(200).json({ user: null });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token', { path: '/' });
  res.json({ message: 'Logged out' });
});

module.exports = router;
