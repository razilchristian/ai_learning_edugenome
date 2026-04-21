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
const db = new sqlite3.Database('database.sqlite');

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

// ================= ROOT (FIXED UI) =================
app.get('/', (req, res) => {
    res.redirect('/login'); // 👈 now UI loads directly
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

// Login
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    db.get(`SELECT * FROM users WHERE email=?`, [email], async (err, user) => {
        if (!user) return res.status(401).json({ error: 'Invalid login' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ error: 'Invalid login' });

        const token = jwt.sign(user, JWT_SECRET);
        res.cookie('token', token, { httpOnly: true });

        res.json({ message: 'Login success' });
    });
});

// Chat
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

app.get('/student', authenticate, (req, res) =>
    res.render('student_dashboard.html', { user: req.user })
);

// ✅ FIXED ROUTES (IMPORTANT)

app.get('/mycourses', authenticate, (req, res) =>
    res.render('mycourses.html')
);

app.get('/learning-path', authenticate, (req, res) =>
    res.render('learning_path.html')
);

app.get('/learning-dna', authenticate, (req, res) =>
    res.render('learning_dna.html')
);

app.get('/ai-tutor', authenticate, (req, res) =>
    res.render('ai_tutor.html')
);

app.get('/gamification', authenticate, (req, res) => {
    res.render('gamification.html', { user: req.user });
});
app.get('/settings', authenticate, (req, res) => {
    res.render('settings.html', { user: req.user });
});

// ================= EXPORT =================
module.exports = serverless(app);

// ================= LOCALHOST =================
if (process.env.NODE_ENV !== 'production') {
    const PORT = 3000;

    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}