const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 40 },
    color: { type: String, required: true, match: /^#[0-9a-fA-F]{6}$/ }
}, { timestamps: true });

categorySchema.index({ user: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);
