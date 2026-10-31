const express = require('express');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Category = require('../models/Category');
const requireAuth = require('../middleware/auth');
const { fromMinorUnits } = require('../lib/money');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
    try {
        const now = new Date();
        const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        const chartStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
        const month = now.toISOString().slice(0, 7);
        const [summary, trend, categoryTotals, budgets, categories, recent] = await Promise.all([
            Transaction.aggregate([
                { $match: { user: req.userId, date: { $gte: monthStart, $lte: now } } },
                { $group: {
                    _id: '$type',
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                } }
            ]),
            Transaction.aggregate([
                { $match: { user: req.userId, date: { $gte: chartStart, $lte: now } } },
                { $group: {
                    _id: {
                        month: { $dateToString: { format: '%Y-%m', date: '$date', timezone: 'UTC' } },
                        type: '$type'
                    },
                    total: { $sum: '$amount' }
                } },
                { $sort: { '_id.month': 1 } }
            ]),
            Transaction.aggregate([
                { $match: { user: req.userId, type: 'expense', date: { $gte: monthStart, $lte: now } } },
                { $group: { _id: '$category', total: { $sum: '$amount' } } },
                { $sort: { total: -1 } }
            ]),
            Budget.find({ user: req.userId, month }).lean(),
            Category.find({ user: req.userId }).select('name color').lean(),
            Transaction.find({ user: req.userId }).sort({ date: -1, _id: -1 }).limit(6).lean()
        ]);

        const income = fromMinorUnits(summary.find(item => item._id === 'income')?.total || 0);
        const expenses = fromMinorUnits(summary.find(item => item._id === 'expense')?.total || 0);
        const colorByCategory = new Map(categories.map(item => [item.name, item.color]));
        const expenseBudgets = new Map(budgets.map(item => [item.category, item.amount]));
        const budgetSpending = new Map(categoryTotals.map(item => [item._id, item.total]));

        return res.json({
            summary: { income, expenses, balance: income - expenses },
            trend: trend.map(item => ({ ...item, total: fromMinorUnits(item.total) })),
            categories: categoryTotals.map(item => ({
                name: item._id,
                total: fromMinorUnits(item.total),
                color: colorByCategory.get(item._id) || '#9aa5b5'
            })),
            budgets: budgets.map(item => ({
                ...item,
                amount: fromMinorUnits(item.amount),
                spent: fromMinorUnits(budgetSpending.get(item.category) || 0),
                color: colorByCategory.get(item.category) || '#9aa5b5'
            })),
            recent: recent.map(item => ({ ...item, amount: fromMinorUnits(item.amount) }))
        });
    } catch (error) {
        return next(error);
    }
});

module.exports = router;
