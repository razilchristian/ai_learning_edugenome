const express = require('express');
const path = require('path');
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
    .catch(err => console.log(err));

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
app.use('/static', express.static(path.join(__dirname, '../static')));

// ================= VIEWS =================
// No longer using ejs render, using sendFile instead

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

// ================= ROOT =================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../templates/login.html'));
});

// ================= API =================

// ✅ REGISTER with MongoDB
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

// ✅ LOGIN with MongoDB
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

        const token = jwt.sign(user.toObject(), JWT_SECRET);
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

    } catch {
        res.status(500).json({ error: "AI error" });
    }
});

// ================= UI ROUTES (USING SENDFILE) =================

// Login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../templates/login.html'));
});

// Student dashboard
app.get('/student', authenticate, (req, res) => {
    res.sendFile(path.join(__dirname, '../templates/student_dashboard.html'));
});

// Teacher dashboard
app.get('/teacher', authenticate, (req, res) => {
    res.sendFile(path.join(__dirname, '../templates/teacher_dashboard.html'));
});

// Admin dashboard
app.get('/admin', authenticate, (req, res) => {
    res.sendFile(path.join(__dirname, '../templates/admin_dashboard.html'));
});

// My Courses page
app.get('/mycourses', authenticate, (req, res) => {
    res.sendFile(path.join(__dirname, '../templates/mycourses.html'));
});

// Learning Path page
app.get('/learning-path', authenticate, (req, res) => {
    res.sendFile(path.join(__dirname, '../templates/learning_path.html'));
});

// Learning DNA page
app.get('/learning-dna', authenticate, (req, res) => {
    res.sendFile(path.join(__dirname, '../templates/learning_dna.html'));
});

// AI Tutor page
app.get('/ai-tutor', authenticate, (req, res) => {
    res.sendFile(path.join(__dirname, '../templates/ai_tutor.html'));
});

// Gamification page
app.get('/gamification', authenticate, (req, res) => {
    res.sendFile(path.join(__dirname, '../templates/gamification.html'));
});

// Settings page
app.get('/settings', authenticate, (req, res) => {
    res.sendFile(path.join(__dirname, '../templates/settings.html'));
});

// ================= EXPORT =================
module.exports = serverless(app);

if (process.env.NODE_ENV !== 'production') {
    const PORT = 3000;

    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}