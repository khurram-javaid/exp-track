const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

module.exports = function requireAuth(req, res, next) {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).json({ message: 'Please sign in to continue.' });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
        if (!mongoose.isValidObjectId(payload.id)) {
            return res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
        }
        req.userId = new mongoose.Types.ObjectId(payload.id);
        return next();
    } catch {
        return res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
    }
};
