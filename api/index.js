const express = require('express');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const mongoose = require('mongoose');
const serverless = require('serverless-http');

dotenv.config();

const app = express();

// ================= ENV =================
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MONGO_URI = process.env.MONGO_URI;

// ================= MONGODB CONNECTION =================
mongoose.connect(MONGO_URI)
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.log("MongoDB error:", err));

// ================= USER MODEL =================
const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: String
});

const User = mongoose.model('User', UserSchema);

// ================= MIDDLEWARE =================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/static', express.static(path.join(__dirname, 'static')));

// ================= AUTH =================
const authenticate = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return res.redirect('/login');

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        res.clearCookie('token');
        res.redirect('/login');
    }
};

// ================= HELPER FUNCTION =================
const sendHtmlFile = (res, fileName) => {
    const filePath = path.join(__dirname, 'templates', fileName);

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error(`Error loading ${fileName}:`, err);
            return res.status(500).send(`Error loading ${fileName}`);
        }
        res.setHeader('Content-Type', 'text/html');
        res.send(data);
    });
};

// ================= ROOT =================
app.get('/', (req, res) => {
    sendHtmlFile(res, 'landing.html');
});

// ================= API =================

// REGISTER
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        const hashed = await bcrypt.hash(password, 10);

        await User.create({
            name,
            email,
            password: hashed,
            role: role || 'student'
        });

        res.json({ message: 'User created' });

    } catch (err) {
        res.status(400).json({ error: "User already exists" });
    }
});

// LOGIN
app.post('/api/login', async (req, res) => {
    const { email, password, role } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) return res.status(401).json({ error: 'Invalid login' });

        if (user.role.toLowerCase() !== role.toLowerCase()) {
            return res.status(401).json({
                error: `Login as ${user.role}`
            });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ error: 'Invalid login' });

        const token = jwt.sign({ id: user._id, email: user.email, name: user.name, role: user.role }, JWT_SECRET);
        res.cookie('token', token, { httpOnly: true });

        let redirect = '/student';
        if (user.role === 'teacher') redirect = '/teacher';
        else if (user.role === 'admin') redirect = '/admin';

        res.json({
            message: 'Login success',
            role: user.role,
            redirect
        });

    } catch (err) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// LOGOUT
app.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/login');
});

// ================= CHAT =================
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
                system_instruction: { parts: [{ text: system || "" }] },
                contents
            }
        );

        const text = response.data.candidates[0].content.parts[0].text;
        res.json({ text });

    } catch (err) {
        console.error('Chat error:', err);
        res.status(500).json({ error: "AI error" });
    }
});

// ================= UI ROUTES =================

// Login page
app.get('/login', (req, res) => {
    sendHtmlFile(res, 'login.html');
});

// Student routes
app.get('/student', authenticate, (req, res) => {
    sendHtmlFile(res, 'student_dashboard.html');
});

app.get('/mycourses', authenticate, (req, res) => {
    sendHtmlFile(res, 'mycourses.html');
});

app.get('/learning-path', authenticate, (req, res) => {
    sendHtmlFile(res, 'learning_path.html');
});

app.get('/learning-dna', authenticate, (req, res) => {
    sendHtmlFile(res, 'learning_dna.html');
});

app.get('/ai-tutor', authenticate, (req, res) => {
    sendHtmlFile(res, 'ai_tutor.html');
});

app.get('/gamification', authenticate, (req, res) => {
    sendHtmlFile(res, 'gamification.html');
});

app.get('/settings', authenticate, (req, res) => {
    sendHtmlFile(res, 'settings.html');
});

app.get('/analytics', authenticate, (req, res) => {
    sendHtmlFile(res, 'analytics.html');
});

app.get('/failure-prediction', authenticate, (req, res) => {
    sendHtmlFile(res, 'failure_prediction.html');
});

// Teacher routes
app.get('/teacher', authenticate, (req, res) => {
    if (req.user.role !== 'teacher') return res.redirect('/student');
    sendHtmlFile(res, 'teacher_dashboard.html');
});

app.get('/mycoursesteacher', authenticate, (req, res) => {
    if (req.user.role !== 'teacher') return res.redirect('/student');
    sendHtmlFile(res, 'mycourseteacher.html');
});

app.get('/mystudents', authenticate, (req, res) => {
    if (req.user.role !== 'teacher') return res.redirect('/student');
    sendHtmlFile(res, 'mystudents.html');
});

// Admin routes
app.get('/admin', authenticate, (req, res) => {
    if (req.user.role !== 'admin') return res.redirect('/student');
    sendHtmlFile(res, 'admin_dashboard.html');
});

// ================= EXPORT =================
module.exports = serverless(app);

if (process.env.NODE_ENV !== 'production') {
    const PORT = 3000;
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}