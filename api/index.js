const express = require('express');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const mongoose = require('mongoose');

// Load .env from root
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();

// ================= ENV =================
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MONGO_URI = process.env.MONGO_URI;

// ================= MONGODB CONNECTION =================
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

// ================= QUIZ MODEL =================
const QuizSchema = new mongoose.Schema({
    subject: String,
    title: String,
    duration: Number, // in minutes
    questions: [
        {
            question: String,
            options: [String],
            answer: String
        }
    ]
});

const Quiz = mongoose.models.Quiz || mongoose.model('Quiz', QuizSchema);

// ================= COURSE MODEL =================
const CourseSchema = new mongoose.Schema({
    semester: Number,
    subjects: [
        {
            name: String,
            description: String,
            units: [
                {
                    title: String,
                    contentType: String, // video, ppt, notes
                    contentUrl: String,
                    duration: String,
                    isCompleted: { type: Boolean, default: false }
                }
            ]
        }
    ]
});

const Course = mongoose.models.Course || mongoose.model('Course', CourseSchema);

// ================= MIDDLEWARE =================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ================= SIMPLE STATIC FILE SERVING =================
// Serve static files from the static folder
app.use('/static', express.static(path.join(__dirname, '..', 'public', 'static')));
// Serve public media content
app.use('/videos', express.static(path.join(__dirname, '..', 'public', 'videos')));
app.use('/pdfs', express.static(path.join(__dirname, '..', 'public', 'pdfs')));

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

// ================= HELPER: Serve HTML =================
const serveHtmlFile = (res, fileName) => {
    const filePath = path.join(__dirname, '..', 'templates', fileName);
    res.sendFile(filePath);
};

// ================= ROUTES =================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'templates', 'login.html'));
});

// Auth routes
app.post('/api/register', async (req, res) => {
    try {
        await connectDB();
        const { name, email, password, role } = req.body;
        const hashed = await bcrypt.hash(password, 10);
        await User.create({ name, email, password: hashed, role: role || 'student' });
        res.json({ message: 'User created' });
    } catch (err) {
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

// Chat route
app.post('/api/chat', authenticate, async (req, res) => {
    try {
        const { system, messages } = req.body;
        const contents = messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
        }));

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
            {
                system_instruction: { parts: [{ text: system || '' }] },
                contents
            }
        );

        const text = response.data.candidates[0].content.parts[0].text;
        res.json({ text });
    } catch (err) {
        console.error('Chat API Error:', err.response?.data || err.message);
        res.status(500).json({ error: { message: err.response?.data?.error?.message || 'AI error' } });
    }
});

// Page routes
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'templates', 'login.html'));
});

app.get('/teacher-login', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'templates', 'teacher-login.html'));
});

app.get('/admin-login', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'templates', 'admin-login.html'));
});

// Quiz routes
app.post('/api/quiz', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        await connectDB();
        const quiz = await Quiz.create(req.body);
        res.json({ message: 'Quiz created successfully', quiz });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create quiz' });
    }
});

app.get('/api/quizzes', authenticate, async (req, res) => {
    try {
        await connectDB();
        const quizzes = await Quiz.find({}, 'subject title duration');
        res.json(quizzes);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch quizzes' });
    }
});

app.get('/api/quiz/:id', authenticate, async (req, res) => {
    try {
        await connectDB();
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
        // Don't send answers to students
        if (req.user.role === 'student') {
            const safeQuiz = quiz.toObject();
            safeQuiz.questions.forEach(q => delete q.answer);
            return res.json(safeQuiz);
        }
        res.json(quiz);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch quiz' });
    }
});

app.post('/api/quiz/submit', authenticate, async (req, res) => {
    try {
        await connectDB();
        const { quizId, answers } = req.body;
        const quiz = await Quiz.findById(quizId);
        if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

        let score = 0;
        quiz.questions.forEach((q, index) => {
            if (answers[index] === q.answer) {
                score++;
            }
        });

        res.json({ score, total: quiz.questions.length });
    } catch (error) {
        res.status(500).json({ error: 'Failed to submit quiz' });
    }
});

app.get('/quiz', authenticate, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'templates', 'quiz.html'));
});

app.get('/manage-quiz', authenticate, (req, res) => {
    if (req.user.role === 'student') return res.redirect('/student');
    res.sendFile(path.join(__dirname, '..', 'templates', 'manage_quiz.html'));
});

app.get('/student', authenticate, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'templates', 'student_dashboard.html'));
});

app.get('/teacher', authenticate, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'templates', 'teacher_dashboard.html'));
});

app.get('/admin', authenticate, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'templates', 'admin_dashboard.html'));
});

app.get('/mycourses', authenticate, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'templates', 'mycourses.html'));
});

app.get('/mycourseteacher', authenticate, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'templates', 'mycourseteacher.html'));
});

app.get('/mystudents', authenticate, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'templates', 'mystudents.html'));
});

app.get('/learning-path', authenticate, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'templates', 'learning_path.html'));
});

app.get('/learning-dna', authenticate, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'templates', 'learning_dna.html'));
});

app.get('/ai-tutor', authenticate, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'templates', 'ai_tutor.html'));
});

app.get('/gamification', authenticate, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'templates', 'gamification.html'));
});

app.get('/analytics', authenticate, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'templates', 'analytics.html'));
});

app.get('/failure-prediction', authenticate, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'templates', 'failure_prediction.html'));
});

app.get('/settings', authenticate, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'templates', 'settings.html'));
});

// ================= COURSE APIS =================
app.get('/api/semesters', authenticate, async (req, res) => {
    try {
        await connectDB();
        const courses = await Course.find({}, 'semester subjects.name subjects.units').sort({ semester: 1 });
        res.json(courses);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch semesters' });
    }
});

app.get('/api/semesters/:id', authenticate, async (req, res) => {
    try {
        await connectDB();
        const course = await Course.findOne({ semester: parseInt(req.params.id) });
        if (!course) return res.status(404).json({ error: 'Semester not found' });
        res.json(course);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch semester' });
    }
});

app.get('/api/subjects/:id', authenticate, async (req, res) => {
    try {
        await connectDB();
        const course = await Course.findOne({ 'subjects._id': req.params.id });
        if (!course) return res.status(404).json({ error: 'Subject not found' });
        const subject = course.subjects.id(req.params.id);
        res.json({ subject, semester: course.semester });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch subject' });
    }
});

app.get('/api/unit/:id', authenticate, async (req, res) => {
    try {
        await connectDB();
        const course = await Course.findOne({ 'subjects.units._id': req.params.id });
        if (!course) return res.status(404).json({ error: 'Unit not found' });
        
        let unitFound = null;
        let subjectFound = null;
        for (const subject of course.subjects) {
            const unit = subject.units.id(req.params.id);
            if (unit) {
                unitFound = unit;
                subjectFound = subject;
                break;
            }
        }
        res.json({ unit: unitFound, subjectId: subjectFound._id });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch unit' });
    }
});

app.patch('/api/unit/:id/complete', authenticate, async (req, res) => {
    try {
        await connectDB();
        const course = await Course.findOne({ 'subjects.units._id': req.params.id });
        if (!course) return res.status(404).json({ error: 'Unit not found' });
        
        let unitFound = null;
        for (const subject of course.subjects) {
            const unit = subject.units.id(req.params.id);
            if (unit) {
                unit.isCompleted = true;
                unitFound = unit;
                break;
            }
        }
        await course.save();
        res.json({ message: 'Unit completed', unit: unitFound });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update unit' });
    }
});

// ================= COURSE PAGES =================
app.get('/semester', authenticate, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'templates', 'semester.html'));
});

app.get('/subject', authenticate, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'templates', 'subject.html'));
});

app.get('/unit', authenticate, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'templates', 'unit.html'));
});

// ================= EXPORT =================
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