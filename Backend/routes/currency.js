const express = require('express');
const requireAuth = require('../middleware/auth');
const { getExchangeRates } = require('../lib/exchangeRates');

const router = express.Router();
router.use(requireAuth);

router.get('/rates', async (req, res, next) => {
    try {
        return res.json(await getExchangeRates());
    } catch (error) {
        return next(error);
    }
});

module.exports = router;
