const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    description: { type: String, required: true, trim: true, maxlength: 120 },
    amount: {
        type: Number,
        required: true,
        min: 1,
        max: 10000000000,
        validate: Number.isInteger
    },
    type: { type: String, enum: ['income', 'expense'], required: true },
    category: { type: String, required: true, trim: true, maxlength: 40 },
    date: { type: Date, required: true },
    notes: { type: String, trim: true, maxlength: 500, default: '' }
}, { timestamps: true });

transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ user: 1, category: 1, date: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
