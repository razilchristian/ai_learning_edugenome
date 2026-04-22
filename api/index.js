const express = require('express');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const mongoose = require('mongoose');

const app = express();

// ================= ENV =================
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MONGO_URI = process.env.MONGO_URI;

// ================= MONGODB - LAZY CACHED CONNECTION =================
let cachedConn = null;

async function connectDB() {
    if (cachedConn && mongoose.connection.readyState === 1) return cachedConn;
    cachedConn = await mongoose.connect(MONGO_URI, {
        serverSelectionTimeoutMS: 8000,
        socketTimeoutMS: 10000,
        maxPoolSize: 1,
    });
    console.log('MongoDB connected');
    return cachedConn;
}

// ================= USER MODEL =================
const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: String
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

// ================= MIDDLEWARE =================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/static', express.static(path.join(__dirname, '../static')));

// ================= AUTH =================
const authenticate = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return res.redirect('/login');
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        res.clearCookie('token');
        res.redirect('/login');
    }
};

// ================= HTML HELPER =================
const templatePath = (name) => path.join(__dirname, '../templates', name);

const serveHtml = (res, name) => {
    const filePath = templatePath(name);
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Missing template:', filePath, err.message);
            return res.status(500).send('Template not found: ' + name);
        }
        res.setHeader('Content-Type', 'text/html');
        res.send(data);
    });
};

// ================= ROUTES =================

app.get('/', (req, res) => serveHtml(res, 'login.html'));
app.get('/login', (req, res) => serveHtml(res, 'login.html'));

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

// REGISTER
app.post('/api/register', async (req, res) => {
    try {
        await connectDB();
        const { name, email, password, role } = req.body;
        const hashed = await bcrypt.hash(password, 10);
        await User.create({ name, email, password: hashed, role: role || 'student' });
        res.json({ message: 'User created' });
    } catch (err) {
        console.error('Register error:', err.message);
        res.status(400).json({ error: 'User already exists' });
    }
});

// LOGIN
app.post('/api/login', async (req, res) => {
    try {
        await connectDB();
        const { email, password, role } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ error: 'Invalid login' });
        if (user.role.toLowerCase() !== role.toLowerCase())
            return res.status(401).json({ error: 'Login as ' + user.role });
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ error: 'Invalid login' });
        const token = jwt.sign(
            { _id: user._id, name: user.name, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        res.cookie('token', token, { httpOnly: true });
        const redirect = user.role === 'teacher' ? '/teacher' : user.role === 'admin' ? '/admin' : '/student';
        res.json({ message: 'Login success', role: user.role, redirect });
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ error: 'Login failed' });
    }
});

// CURRENT USER
app.get('/api/me', authenticate, (req, res) => {
    res.json({ name: req.user.name || '', email: req.user.email || '', role: req.user.role || '' });
});

// LOGOUT
app.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/login');
});

// AI CHAT
app.post('/api/chat', authenticate, async (req, res) => {
    try {
        const { system, messages } = req.body;
        const contents = messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
        }));
        const response = await axios.post(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + GEMINI_API_KEY,
            { system_instruction: { parts: [{ text: system || '' }] }, contents }
        );
        res.json({ text: response.data.candidates[0].content.parts[0].text });
    } catch (err) {
        console.error('Chat error:', err?.response?.data || err.message);
        res.status(500).json({ error: 'AI error' });
    }
});

// PAGE ROUTES
app.get('/student', authenticate, (req, res) => serveHtml(res, 'student_dashboard.html'));
app.get('/teacher', authenticate, (req, res) => serveHtml(res, 'teacher_dashboard.html'));
app.get('/admin', authenticate, (req, res) => serveHtml(res, 'admin_dashboard.html'));
app.get('/mycourses', authenticate, (req, res) => serveHtml(res, 'mycourses.html'));
app.get('/mycourseteacher', authenticate, (req, res) => serveHtml(res, 'mycourseteacher.html'));
app.get('/mystudents', authenticate, (req, res) => serveHtml(res, 'mystudents.html'));
app.get('/learning-path', authenticate, (req, res) => serveHtml(res, 'learning_path.html'));
app.get('/learning-dna', authenticate, (req, res) => serveHtml(res, 'learning_dna.html'));
app.get('/ai-tutor', authenticate, (req, res) => serveHtml(res, 'ai_tutor.html'));
app.get('/gamification', authenticate, (req, res) => serveHtml(res, 'gamification.html'));
app.get('/analytics', authenticate, (req, res) => serveHtml(res, 'analytics.html'));
app.get('/failure-prediction', authenticate, (req, res) => serveHtml(res, 'failure_prediction.html'));
app.get('/settings', authenticate, (req, res) => serveHtml(res, 'settings.html'));

// ================= EXPORT =================
// No serverless-http wrapper - Vercel handles Express apps natively
module.exports = app;