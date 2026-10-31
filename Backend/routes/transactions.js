const express = require('express');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const requireAuth = require('../middleware/auth');
const { isObjectId, validAmount, validText } = require('../lib/validation');
const { fromMinorUnits, toMinorUnits } = require('../lib/money');

const router = express.Router();
router.use(requireAuth);

function parseTransaction(body = {}) {
    const { description, amount, type, category, date, notes = '' } = body && typeof body === 'object' ? body : {};
    const parsedDate = new Date(date);
    if (!validText(description, 120) || !validAmount(amount) ||
        !['income', 'expense'].includes(type) || !validText(category, 40) ||
        typeof date !== 'string' || Number.isNaN(parsedDate.getTime()) ||
        typeof notes !== 'string' || notes.length > 500) {
        return null;
    }
    return {
        description: description.trim(),
        amount: toMinorUnits(amount),
        type,
        category: category.trim(),
        date: parsedDate,
        notes: notes.trim()
    };
}

async function ownsCategory(userId, category) {
    return Category.exists({ user: userId, name: category });
}

function validDateFilter(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validAmountFilter(value) {
    const amount = Number(value);
    return typeof value === 'string' && value.trim() !== '' &&
        Number.isFinite(amount) && amount >= 0 && amount <= 100000000 &&
        Math.abs(amount * 100 - Math.round(amount * 100)) < 1e-8;
}

router.get('/', async (req, res, next) => {
    try {
        const { q, type, category, from, to, min, max, sort = 'date_desc', page = '1', limit = '50' } = req.query;
        const filter = { user: req.userId };
        if (type && !['income', 'expense'].includes(type)) {
            return res.status(400).json({ message: 'Choose a valid transaction type.' });
        }
        if (category && (typeof category !== 'string' || category.length > 40)) {
            return res.status(400).json({ message: 'Choose a valid category.' });
        }
        if (type) filter.type = type;
        if (category) filter.category = category;
        if (from || to) {
            filter.date = {};
            if ((from && !validDateFilter(from)) || (to && !validDateFilter(to))) {
                return res.status(400).json({ message: 'Enter valid date filters.' });
            }
            if (from) filter.date.$gte = new Date(from);
            if (to) {
                const inclusiveTo = new Date(to);
                inclusiveTo.setUTCHours(23, 59, 59, 999);
                filter.date.$lte = inclusiveTo;
            }
        }
        const hasMin = min !== undefined && min !== '';
        const hasMax = max !== undefined && max !== '';
        if (hasMin || hasMax) {
            filter.amount = {};
            if ((hasMin && !validAmountFilter(min)) || (hasMax && !validAmountFilter(max)) ||
                (hasMin && hasMax && Number(min) > Number(max))) {
                return res.status(400).json({ message: 'Enter a valid amount range.' });
            }
            if (hasMin) filter.amount.$gte = toMinorUnits(Number(min));
            if (hasMax) filter.amount.$lte = toMinorUnits(Number(max));
        }
        if (typeof q === 'string' && q.trim()) {
            const escaped = q.trim().slice(0, 80).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            filter.$or = [
                { description: { $regex: escaped, $options: 'i' } },
                { category: { $regex: escaped, $options: 'i' } },
                { notes: { $regex: escaped, $options: 'i' } }
            ];
        }

        const sortOptions = {
            date_desc: { date: -1, _id: -1 },
            date_asc: { date: 1, _id: 1 },
            amount_desc: { amount: -1, date: -1 },
            amount_asc: { amount: 1, date: -1 },
            description_asc: { description: 1 }
        };
        const currentPage = Math.max(1, Math.min(100000, Number.parseInt(page, 10) || 1));
        const pageSize = Math.max(1, Math.min(100, Number.parseInt(limit, 10) || 50));
        const [items, total] = await Promise.all([
            Transaction.find(filter)
                .sort(sortOptions[sort] || sortOptions.date_desc)
                .skip((currentPage - 1) * pageSize)
                .limit(pageSize)
                .lean(),
            Transaction.countDocuments(filter)
        ]);
        return res.json({
            items: items.map(item => ({ ...item, amount: fromMinorUnits(item.amount) })),
            total,
            page: currentPage,
            limit: pageSize
        });
    } catch (error) {
        return next(error);
    }
});

router.post('/', async (req, res, next) => {
    try {
        const data = parseTransaction(req.body);
        if (!data) return res.status(400).json({ message: 'Check the transaction details and try again.' });
        if (!(await ownsCategory(req.userId, data.category))) {
            return res.status(400).json({ message: 'Choose one of your saved categories.' });
        }
        const transaction = await Transaction.create({ ...data, user: req.userId });
        return res.status(201).json({
            item: { ...transaction.toObject(), amount: fromMinorUnits(transaction.amount) }
        });
    } catch (error) {
        return next(error);
    }
});

router.patch('/:id', async (req, res, next) => {
    try {
        if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid transaction.' });
        const data = parseTransaction(req.body);
        if (!data) return res.status(400).json({ message: 'Check the transaction details and try again.' });
        if (!(await ownsCategory(req.userId, data.category))) {
            return res.status(400).json({ message: 'Choose one of your saved categories.' });
        }
        const transaction = await Transaction.findOneAndUpdate(
            { _id: req.params.id, user: req.userId },
            data,
            { new: true, runValidators: true }
        );
        if (!transaction) return res.status(404).json({ message: 'Transaction not found.' });
        return res.json({
            item: { ...transaction.toObject(), amount: fromMinorUnits(transaction.amount) }
        });
    } catch (error) {
        return next(error);
    }
});

router.delete('/:id', async (req, res, next) => {
    try {
        if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid transaction.' });
        const transaction = await Transaction.findOneAndDelete({ _id: req.params.id, user: req.userId });
        if (!transaction) return res.status(404).json({ message: 'Transaction not found.' });
        return res.json({ success: true });
    } catch (error) {
        return next(error);
    }
});

module.exports = router;
