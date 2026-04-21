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
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.set('views', path.join(__dirname, '../templates'));

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
    res.redirect('/login');
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

// ================= UI ROUTES =================

// ROOT → login page
app.get('/', (req, res) => {
    res.render('login.html');
});

// Login
app.get('/login', (req, res) => {
    res.render('login.html');
});

// Student
app.get('/student', authenticate, (req, res) => {
    res.render('student_dashboard.html', { user: req.user });
});

// Teacher
app.get('/teacher', authenticate, (req, res) => {
    res.render('teacher_dashboard.html', { user: req.user });
});

// Admin
app.get('/admin', authenticate, (req, res) => {
    res.render('admin_dashboard.html', { user: req.user });
});

// Other pages
app.get('/mycourses', authenticate, (req, res) => {
    res.render('mycourses.html', { user: req.user });
});

app.get('/learning-path', authenticate, (req, res) => {
    res.render('learning_path.html', { user: req.user });
});

app.get('/learning-dna', authenticate, (req, res) => {
    res.render('learning_dna.html', { user: req.user });
});

app.get('/ai-tutor', authenticate, (req, res) => {
    res.render('ai_tutor.html', { user: req.user });
});

app.get('/gamification', authenticate, (req, res) => {
    res.render('gamification.html', { user: req.user });
});

app.get('/settings', authenticate, (req, res) => {
    res.render('settings.html', { user: req.user });
});
// ================= EXPORT =================
module.exports = serverless(app);

if (process.env.NODE_ENV !== 'production') {
    const PORT = 3000;

    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}