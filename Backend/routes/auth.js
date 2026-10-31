const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Category = require('../models/Category');
const requireAuth = require('../middleware/auth');
const { emailPattern, validText } = require('../lib/validation');

const router = express.Router();
const defaultCategories = [
    { name: 'Food & dining', color: '#f5a66b' },
    { name: 'Transport', color: '#8b9cf7' },
    { name: 'Shopping', color: '#e989a5' },
    { name: 'Bills & utilities', color: '#6ec9b2' },
    { name: 'Entertainment', color: '#bd8af0' },
    { name: 'Salary', color: '#66b791' },
    { name: 'Investments', color: '#5fa9c8' },
    { name: 'Health', color: '#70b7e5' },
    { name: 'Other', color: '#9aa5b5' }
];

function setSessionCookie(res, userId) {
    const sameSite = process.env.COOKIE_SAME_SITE || 'lax';
    const secure = process.env.NODE_ENV === 'production' || sameSite === 'none';
    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        algorithm: 'HS256',
        expiresIn: '7d'
    });

    res.cookie('token', token, {
        httpOnly: true,
        secure,
        sameSite,
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {})
    });
}

function publicUser(user) {
    return { id: user._id, name: user.name, email: user.email, currency: user.currency || 'USD' };
}

router.post('/register', async (req, res, next) => {
    try {
        const { name, email, password } = req.body;
        if (!validText(name, 80) || !validText(email, 254) || !emailPattern.test(email.trim())) {
            return res.status(400).json({ message: 'Enter a name and a valid email address.' });
        }
        if (typeof password !== 'string' || password.length < 10 || Buffer.byteLength(password, 'utf8') > 72) {
            return res.status(400).json({ message: 'Password must be at least 10 characters and no more than 72 UTF-8 bytes.' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        if (await User.exists({ email: normalizedEmail })) {
            return res.status(409).json({ message: 'An account with this email already exists.' });
        }

        const user = await User.create({ name: name.trim(), email: normalizedEmail, password });
        try {
            await Category.insertMany(defaultCategories.map(category => ({ ...category, user: user._id })));
        } catch (error) {
            await User.deleteOne({ _id: user._id });
            throw error;
        }
        setSessionCookie(res, user._id);
        return res.status(201).json({ success: true, user: publicUser(user) });
    } catch (error) {
        return next(error);
    }
});

router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (typeof email !== 'string' || !emailPattern.test(email.trim()) ||
            typeof password !== 'string' || Buffer.byteLength(password, 'utf8') > 72) {
            return res.status(400).json({ message: 'Enter a valid email and password.' });
        }
        const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ message: 'Email or password is incorrect.' });
        }

        setSessionCookie(res, user._id);
        return res.json({ success: true, user: publicUser(user) });
    } catch (error) {
        return next(error);
    }
});

router.post('/logout', (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' || process.env.COOKIE_SAME_SITE === 'none',
        sameSite: process.env.COOKIE_SAME_SITE || 'lax',
        path: '/',
        ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {})
    });
    return res.json({ success: true });
});

router.patch('/currency', requireAuth, async (req, res, next) => {
    try {
        const { currency } = req.body;
        if (!['USD', 'PKR', 'EUR'].includes(currency)) {
            return res.status(400).json({ message: 'Choose USD, PKR, or EUR.' });
        }
        const user = await User.findById(req.userId);
        if (!user) return res.status(401).json({ message: 'Please sign in to continue.' });
        user.currency = currency;
        await user.save();
        return res.json({ success: true, user: publicUser(user) });
    } catch (error) {
        return next(error);
    }
});

router.get('/me', requireAuth, async (req, res, next) => {
    try {
        const user = await User.findById(req.userId).select('name email currency');
        if (!user) return res.status(401).json({ message: 'Please sign in to continue.' });
        return res.json({ success: true, user: publicUser(user) });
    } catch (error) {
        return next(error);
    }
});

module.exports = router;
