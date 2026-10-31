const express = require('express');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const requireAuth = require('../middleware/auth');
const { isObjectId, monthPattern, validAmount, validText } = require('../lib/validation');
const { fromMinorUnits, toMinorUnits } = require('../lib/money');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
    try {
        const month = typeof req.query.month === 'string' && monthPattern.test(req.query.month)
            ? req.query.month
            : new Date().toISOString().slice(0, 7);
        const start = new Date(`${month}-01T00:00:00.000Z`);
        const nextMonth = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
        const now = new Date();
        const end = month === now.toISOString().slice(0, 7) ? now :
            month > now.toISOString().slice(0, 7) ? start : nextMonth;
        const [budgets, spending] = await Promise.all([
            Budget.find({ user: req.userId, month }).sort({ category: 1 }).lean(),
            Transaction.aggregate([
                { $match: { user: req.userId, type: 'expense', date: { $gte: start, $lt: end } } },
                { $group: { _id: '$category', spent: { $sum: '$amount' } } }
            ])
        ]);
        const spentByCategory = new Map(spending.map(item => [item._id, item.spent]));
        return res.json({
            items: budgets.map(budget => ({
                ...budget,
                amount: fromMinorUnits(budget.amount),
                spent: fromMinorUnits(spentByCategory.get(budget.category) || 0)
            }))
        });
    } catch (error) {
        return next(error);
    }
});

router.put('/', async (req, res, next) => {
    try {
        const { category, amount, month = new Date().toISOString().slice(0, 7) } = req.body;
        if (!validText(category, 40) || !validAmount(amount) ||
            typeof month !== 'string' || !monthPattern.test(month)) {
            return res.status(400).json({ message: 'Enter a category, valid budget amount, and month.' });
        }
        if (!(await Category.exists({ user: req.userId, name: category.trim() }))) {
            return res.status(400).json({ message: 'Choose one of your saved categories.' });
        }
        const budget = await Budget.findOneAndUpdate(
            { user: req.userId, category: category.trim(), month },
            { $set: { amount: toMinorUnits(amount) } },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
        );
        return res.json({ item: { ...budget.toObject(), amount: fromMinorUnits(budget.amount) } });
    } catch (error) {
        return next(error);
    }
});

router.delete('/:id', async (req, res, next) => {
    try {
        if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid budget.' });
        const budget = await Budget.findOneAndDelete({ _id: req.params.id, user: req.userId });
        if (!budget) return res.status(404).json({ message: 'Budget not found.' });
        return res.json({ success: true });
    } catch (error) {
        return next(error);
    }
});

module.exports = router;
