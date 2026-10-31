const express = require('express');
const Category = require('../models/Category');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const requireAuth = require('../middleware/auth');
const { isObjectId, validText } = require('../lib/validation');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
    try {
        const categories = await Category.find({ user: req.userId }).sort({ name: 1 }).lean();
        return res.json({ items: categories });
    } catch (error) {
        return next(error);
    }
});

router.post('/', async (req, res, next) => {
    try {
        const { name, color = '#8b9cf7' } = req.body;
        if (!validText(name, 40) || typeof color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(color)) {
            return res.status(400).json({ message: 'Enter a category name and a valid color.' });
        }
        const category = await Category.create({ user: req.userId, name: name.trim(), color });
        return res.status(201).json({ item: category });
    } catch (error) {
        return next(error);
    }
});

router.patch('/:id', async (req, res, next) => {
    try {
        if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid category.' });
        const { name, color } = req.body;
        if (!validText(name, 40) || typeof color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(color)) {
            return res.status(400).json({ message: 'Enter a category name and a valid color.' });
        }
        const existing = await Category.findOne({ _id: req.params.id, user: req.userId });
        if (!existing) return res.status(404).json({ message: 'Category not found.' });
        if (existing.name !== name.trim()) {
            const [inUse, hasBudget] = await Promise.all([
                Transaction.exists({ user: req.userId, category: existing.name }),
                Budget.exists({ user: req.userId, category: existing.name })
            ]);
            if (inUse || hasBudget) {
                return res.status(409).json({ message: 'This category is in use. Remove its transactions and budgets before renaming it.' });
            }
        }
        existing.name = name.trim();
        existing.color = color;
        const category = await existing.save();
        if (!category) return res.status(404).json({ message: 'Category not found.' });
        return res.json({ item: category });
    } catch (error) {
        return next(error);
    }
});

router.delete('/:id', async (req, res, next) => {
    try {
        if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid category.' });
        const category = await Category.findOne({ _id: req.params.id, user: req.userId });
        if (!category) return res.status(404).json({ message: 'Category not found.' });
        const [inUse, hasBudget] = await Promise.all([
            Transaction.exists({ user: req.userId, category: category.name }),
            Budget.exists({ user: req.userId, category: category.name })
        ]);
        if (inUse || hasBudget) {
            return res.status(409).json({ message: 'This category is used by a transaction or budget. Remove those first.' });
        }
        await category.deleteOne();
        return res.json({ success: true });
    } catch (error) {
        return next(error);
    }
});

module.exports = router;
