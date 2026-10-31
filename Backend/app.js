require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const budgetRoutes = require('./routes/budgets');
const categoryRoutes = require('./routes/categories');
const dashboardRoutes = require('./routes/dashboard');
const currencyRoutes = require('./routes/currency');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = (process.env.FRONTEND_URLS || (isProduction ? '' : 'http://localhost:5173,http://localhost:4173,http://127.0.0.1:5173,http://127.0.0.1:4173'))
    .split(',')
    .map(origin => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

function isAllowedOrigin(origin) {
    if (!origin) return true;
    const normalizedOrigin = origin.replace(/\/$/, '');
    if (allowedOrigins.includes(normalizedOrigin)) return true;
    if (isProduction) return false;

    try {
        const parsedOrigin = new URL(normalizedOrigin);
        return parsedOrigin.protocol === 'http:' &&
            ['localhost', '127.0.0.1'].includes(parsedOrigin.hostname);
    } catch {
        return false;
    }
}

if (isProduction && allowedOrigins.length === 0) {
    throw new Error('FRONTEND_URLS must contain the deployed frontend origin in production.');
}

app.disable('x-powered-by');
if (isProduction) app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 1));
app.use(helmet());
app.use(cors({
    origin(origin, callback) {
        callback(null, isAllowedOrigin(origin));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());
app.use((req, res, next) => {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) req.body = {};
    next();
});
app.use((req, res, next) => {
    const origin = req.get('origin');
    if (origin && !isAllowedOrigin(origin) &&
        !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return res.status(403).json({ message: 'This origin is not allowed.' });
    }

    const started = Date.now();
    const requestPath = req.originalUrl.split('?')[0];
    res.on('finish', () => {
        console.log(JSON.stringify({
            level: 'info',
            time: new Date().toISOString(),
            method: req.method,
            path: requestPath,
            status: res.statusCode,
            durationMs: Date.now() - started
        }));
    });
    return next();
});

app.get('/health', (req, res) => {
    const ready = mongoose.connection.readyState === 1;
    return res.status(ready ? 200 : 503).json({
        status: ready ? 'ok' : 'unavailable',
        database: ready ? 'connected' : 'disconnected'
    });
});
app.get('/', (req, res) => res.json({ name: 'Trackio API', health: '/health' }));

app.use('/api', rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-8',
    legacyHeaders: false
}));
app.use('/api/auth', rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 12,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message: 'Too many sign-in attempts. Please try again later.' }
}));
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/currency', currencyRoutes);

app.use((req, res) => res.status(404).json({ message: 'Route not found.' }));
app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error.code === 11000 ? 409 :
        error.name === 'ValidationError' || error.name === 'CastError' ? 400 :
            Number.isInteger(error.status) && error.status >= 400 && error.status < 600 ? error.status : 500;
    console.error(JSON.stringify({
        level: 'error',
        time: new Date().toISOString(),
        path: req.originalUrl.split('?')[0],
        status,
        error: error.message
    }));
    return res.status(status).json({
        message: status === 500 ? 'Something went wrong. Please try again.' :
            status === 503 ? 'Currency rates are temporarily unavailable. Please try again later.' :
            status === 409 ? 'That item already exists.' :
                status === 413 ? 'Request body is too large.' : 'The submitted data is invalid.'
    });
});

async function start() {
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI must be configured on the server.');
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
        throw new Error('JWT_SECRET must be set to at least 32 characters.');
    }
    const sameSite = process.env.COOKIE_SAME_SITE || 'lax';
    if (!['lax', 'strict', 'none'].includes(sameSite)) {
        throw new Error('COOKIE_SAME_SITE must be lax, strict, or none.');
    }

    await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000
    });
    console.log(JSON.stringify({ level: 'info', time: new Date().toISOString(), event: 'database_connected' }));
    const port = Number(process.env.PORT || 5000);
    const server = app.listen(port, '0.0.0.0', () => {
        console.log(JSON.stringify({ level: 'info', time: new Date().toISOString(), event: 'server_listening', port }));
    });

    const shutdown = async signal => {
        console.log(JSON.stringify({ level: 'info', time: new Date().toISOString(), event: 'shutdown', signal }));
        server.close(async () => {
            await mongoose.disconnect();
            process.exit(0);
        });
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}

if (require.main === module) {
    start().catch(error => {
        console.error(JSON.stringify({
            level: 'error',
            time: new Date().toISOString(),
            event: 'startup_failed',
            error: error.message
        }));
        process.exit(1);
    });
}

module.exports = app;
