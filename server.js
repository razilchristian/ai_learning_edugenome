const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const serverless = require('serverless-http');

dotenv.config();

const app = express();

// ================= ENV =================
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ================= DB =================
const db = new sqlite3.Database(':memory:');

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT UNIQUE,
            password TEXT,
            role TEXT
        )
    `);
});

// ================= MIDDLEWARE =================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/static', express.static(path.join(__dirname, 'static')));

// ================= VIEWS =================
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'templates'));

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

// Register
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        const hashed = await bcrypt.hash(password, 10);

        db.run(
            `INSERT INTO users (name,email,password,role) VALUES (?,?,?,?)`,
            [name, email, hashed, role || 'student'],
            function (err) {
                if (err) return res.status(400).json({ error: err.message });
                res.json({ message: 'User created' });
            }
        );

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✅ FINAL LOGIN (ROLE + REDIRECT FIXED)
app.post('/api/login', (req, res) => {
    const { email, password, role } = req.body;

    db.get(`SELECT * FROM users WHERE email=?`, [email], async (err, user) => {
        if (err) return res.status(500).json({ error: 'DB error' });
        if (!user) return res.status(401).json({ error: 'Invalid login' });

        // 🔥 ROLE VALIDATION (IMPORTANT)
        if (user.role !== role) {
            return res.status(401).json({
                error: `You are registered as ${user.role}, not ${role}`
            });
        }

        try {
            const match = await bcrypt.compare(password, user.password);
            if (!match) return res.status(401).json({ error: 'Invalid login' });

            // 🔐 Token
            const token = jwt.sign(user, JWT_SECRET);
            res.cookie('token', token, { httpOnly: true });

            // 🚀 Redirect based on role
            let redirect = '/student';
            if (user.role === 'teacher') redirect = '/teacher';
            else if (user.role === 'admin') redirect = '/admin';

            res.json({
                message: 'Login success',
                role: user.role,
                redirect
            });

        } catch (e) {
            res.status(500).json({ error: 'Login failed' });
        }
    });
});

// Chat (AI)
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
        res.status(500).json({ error: "AI error" });
    }
});

// ================= UI ROUTES =================

app.get('/login', (req, res) => res.render('login.html'));

// ✅ STUDENT
app.get('/student', authenticate, (req, res) =>
    res.render('student_dashboard.html', { user: req.user })
);

// ✅ TEACHER
app.get('/teacher', authenticate, (req, res) =>
    res.render('teacher_dashboard.html', { user: req.user })
);

// ✅ ADMIN (optional)
app.get('/admin', authenticate, (req, res) =>
    res.render('admin_dashboard.html', { user: req.user })
);

// ✅ ALL PAGES (FIXED WITH USER)

app.get('/mycourses', authenticate, (req, res) =>
    res.render('mycourses.html', { user: req.user })
);

app.get('/learning-path', authenticate, (req, res) =>
    res.render('learning_path.html', { user: req.user })
);

app.get('/learning-dna', authenticate, (req, res) =>
    res.render('learning_dna.html', { user: req.user })
);

app.get('/ai-tutor', authenticate, (req, res) =>
    res.render('ai_tutor.html', { user: req.user })
);

app.get('/gamification', authenticate, (req, res) =>
    res.render('gamification.html', { user: req.user })
);

app.get('/settings', authenticate, (req, res) =>
    res.render('settings.html', { user: req.user })
);

app.use('/static', express.static('static'));

// ================= EXPORT =================
module.exports = serverless(app);

// ================= LOCAL =================
if (process.env.NODE_ENV !== 'production') {
    const PORT = 3000;

    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}