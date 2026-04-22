const express = require('express');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const mongoose = require('mongoose');

dotenv.config();

const app = express();

// ================= ENV =================
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MONGO_URI = process.env.MONGO_URI;

// ================= MONGODB CONNECTION (LAZY - fixes 504 timeout) =================
let isConnected = false;

async function connectDB() {
    if (isConnected) return;
    await mongoose.connect(MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 10000,
    });
    isConnected = true;
    console.log('MongoDB connected');
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

// Serve static files
app.use('/static', express.static(path.join(__dirname, 'static')));

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

// ================= HELPER: Serve HTML from /templates =================
const serveHtmlFile = (res, filePath) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error(`Error loading file: ${filePath}`, err);
            return res.status(500).send('Error loading page');
        }
        res.setHeader('Content-Type', 'text/html');
        res.send(data);
    });
};

const templatePath = (name) => path.join(__dirname, 'templates', name);

// ================= ROOT =================
app.get('/', (req, res) => {
    serveHtmlFile(res, templatePath('login.html'));
});

// ================= AUTH ROUTES =================

app.post('/api/register', async (req, res) => {
    try {
        await connectDB();
        const { name, email, password, role } = req.body;
        const hashed = await bcrypt.hash(password, 10);
        await User.create({ name, email, password: hashed, role: role || 'student' });
        res.json({ message: 'User created' });
    } catch (err) {
        console.error('Register error:', err);
        res.status(400).json({ error: 'User already exists' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        await connectDB();
        const { email, password, role } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(401).json({ error: 'Invalid login' });

        if (user.role.toLowerCase() !== role.toLowerCase()) {
            return res.status(401).json({ error: `Login as ${user.role}` });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ error: 'Invalid login' });

        const token = jwt.sign({
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
        }, JWT_SECRET);

        res.cookie('token', token, { httpOnly: true });

        let redirect = '/student';
        if (user.role === 'teacher') redirect = '/teacher';
        else if (user.role === 'admin') redirect = '/admin';

        res.json({ message: 'Login success', role: user.role, redirect });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
});

app.get('/api/me', authenticate, (req, res) => {
    res.json({
        name: req.user.name || '',
        email: req.user.email || '',
        role: req.user.role || ''
    });
});

app.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/login');
});

// ================= AI CHAT =================
app.post('/api/chat', authenticate, async (req, res) => {
    try {
        const { system, messages } = req.body;

        const contents = messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
        }));

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                system_instruction: { parts: [{ text: system || '' }] },
                contents
            }
        );

        const text = response.data.candidates[0].content.parts[0].text;
        res.json({ text });
    } catch (err) {
        console.error('Chat error:', err?.response?.data || err.message);
        res.status(500).json({ error: 'AI error' });
    }
});

// ================= PAGE ROUTES =================

app.get('/login', (req, res) => serveHtmlFile(res, templatePath('login.html')));

app.get('/student', authenticate, (req, res) =>
    serveHtmlFile(res, templatePath('student_dashboard.html')));

app.get('/teacher', authenticate, (req, res) =>
    serveHtmlFile(res, templatePath('teacher_dashboard.html')));

app.get('/admin', authenticate, (req, res) =>
    serveHtmlFile(res, templatePath('admin_dashboard.html')));

app.get('/mycourses', authenticate, (req, res) =>
    serveHtmlFile(res, templatePath('mycourses.html')));

app.get('/mycourseteacher', authenticate, (req, res) =>
    serveHtmlFile(res, templatePath('mycourseteacher.html')));

app.get('/mystudents', authenticate, (req, res) =>
    serveHtmlFile(res, templatePath('mystudents.html')));

app.get('/learning-path', authenticate, (req, res) =>
    serveHtmlFile(res, templatePath('learning_path.html')));

app.get('/learning-dna', authenticate, (req, res) =>
    serveHtmlFile(res, templatePath('learning_dna.html')));

app.get('/ai-tutor', authenticate, (req, res) =>
    serveHtmlFile(res, templatePath('ai_tutor.html')));

app.get('/gamification', authenticate, (req, res) =>
    serveHtmlFile(res, templatePath('gamification.html')));

app.get('/analytics', authenticate, (req, res) =>
    serveHtmlFile(res, templatePath('analytics.html')));

app.get('/failure-prediction', authenticate, (req, res) =>
    serveHtmlFile(res, templatePath('failure_prediction.html')));

app.get('/settings', authenticate, (req, res) =>
    serveHtmlFile(res, templatePath('settings.html')));

// ================= EXPORT FOR VERCEL =================
// No serverless-http needed - just export app directly
module.exports = app;

// Local dev only
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    connectDB().then(() => {
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    });
}