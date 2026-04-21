const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const db = require('./db');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_local_dev_only';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

if (!GEMINI_API_KEY) {
    console.warn('WARNING: GEMINI_API_KEY is not set in environment variables.');
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/static', express.static(path.join(__dirname, 'static')));

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'templates'));

// Authentication Middleware
const authenticate = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        return res.redirect('/login');
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.clearCookie('token');
        return res.redirect('/login');
    }
};

// API Routes
app.post('/api/register', async (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const userRole = role || 'student';
        db.run(`INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`, 
            [name, email, hashedPassword, userRole], 
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(400).json({ error: 'Email already exists' });
                    }
                    return res.status(500).json({ error: 'Database error' });
                }
                res.status(201).json({ message: 'User created successfully', id: this.lastID });
            }
        );
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!user) return res.status(401).json({ error: 'Invalid email or password' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid email or password' });

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
        res.cookie('token', token, { httpOnly: true });
        
        const redirectUrl = user.role === 'teacher' ? '/teacher' : '/student';
        res.json({ message: 'Logged in successfully', redirect: redirectUrl });
    });
});

app.get('/api/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/login');
});

// Gemini Chat API Proxy
app.post('/api/chat', authenticate, async (req, res) => {
    try {
        const { system, messages } = req.body;
        
        const contents = messages.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }));

        const geminiPayload = {
            system_instruction: { parts: [{ text: system || "" }] },
            contents: contents,
            generationConfig: {
                maxOutputTokens: 1000,
                temperature: 0.7
            }
        };

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            geminiPayload,
            { headers: { 'Content-Type': 'application/json' } }
        );

        const text = response.data.candidates[0].content.parts[0].text;
        res.status(200).json({ content: [{ type: 'text', text: text }] });

    } catch (err) {
        console.error('Chat API Error:', err?.response?.data || err.message);
        res.status(500).json({ error: { message: err?.response?.data || err.message } });
    }
});

// Page Routes
app.get('/', (req, res) => res.render('landing.html'));
app.get('/login', (req, res) => res.render('login.html'));

app.get('/student', authenticate, (req, res) => res.render('student_dashboard.html', { user: req.user }));
app.get('/learning-path', authenticate, (req, res) => res.render('learning_path.html', { user: req.user }));
app.get('/learning-dna', authenticate, (req, res) => res.render('learning_dna.html', { user: req.user }));
app.get('/ai-tutor', authenticate, (req, res) => res.render('ai_tutor.html', { user: req.user }));
app.get('/gamification', authenticate, (req, res) => res.render('gamification.html', { user: req.user }));
app.get('/settings', authenticate, (req, res) => res.render('settings.html', { user: req.user }));
app.get('/mycourses', authenticate, (req, res) => res.render('mycourses.html', { user: req.user }));

app.get('/teacher', authenticate, (req, res) => res.render('teacher_dashboard.html', { user: req.user }));
app.get('/mystudents', authenticate, (req, res) => res.render('mystudents.html', { user: req.user }));
app.get('/mycourseteacher', authenticate, (req, res) => res.render('mycourseteacher.html', { user: req.user }));
app.get('/analytics', authenticate, (req, res) => res.render('analytics.html', { user: req.user }));

app.get('/failure-prediction', authenticate, (req, res) => {
    res.render('failure_prediction.html', { user: req.user, result: null, score: null, inputs: null });
});

app.post('/predict-risk', authenticate, (req, res) => {
    const attendance = parseFloat(req.body.attendance);
    const assignment = parseFloat(req.body.assignment);
    const quiz = parseFloat(req.body.quiz);

    const score = (attendance * 0.4 + assignment * 0.3 + quiz * 0.3);

    let result = "Low Risk";
    if (score < 50) {
        result = "High Risk";
    } else if (score < 70) {
        result = "Medium Risk";
    }

    const inputs = { attendance, assignment, quiz };
    res.render('failure_prediction.html', { user: req.user, result, score: score.toFixed(1), inputs });
});

app.get('/admin', authenticate, (req, res) => res.render('admin_dashboard.html', { user: req.user }));

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}
module.exports = app;
