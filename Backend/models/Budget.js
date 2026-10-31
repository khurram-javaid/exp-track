const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: { type: String, required: true, trim: true, maxlength: 40 },
    month: { type: String, required: true, match: /^\d{4}-\d{2}$/ },
    amount: {
        type: Number,
        required: true,
        min: 100,
        max: 10000000000,
        validate: Number.isInteger
    }
}, { timestamps: true });

budgetSchema.index({ user: 1, month: 1, category: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);
