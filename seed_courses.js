const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const MONGO_URI = process.env.MONGO_URI;

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

const semestersData = [
    {
        semester: 1,
        subjects: [
            { name: "Programming Fundamentals", description: "Learn the basics of coding with Python and C." },
            { name: "Mathematics I", description: "Calculus and linear algebra for computer science." },
            { name: "Physics", description: "Fundamentals of mechanics and electricity." },
            { name: "Digital Logic Design", description: "Understanding logic gates and boolean algebra." },
            { name: "Communication Skills", description: "Effective professional communication." }
        ]
    },
    {
        semester: 2,
        subjects: [
            { name: "Object Oriented Programming", description: "Advanced concepts using C++ and Java." },
            { name: "Mathematics II", description: "Differential equations and discrete math." },
            { name: "Computer Organization", description: "Basic computer architecture." },
            { name: "Basic Electronics", description: "Electronic devices and circuits." },
            { name: "Engineering Drawing", description: "Technical drawing basics." }
        ]
    },
    {
        semester: 3,
        subjects: [
            { name: "Data Structures", description: "Arrays, lists, trees, and graphs." },
            { name: "Discrete Mathematics", description: "Logic, sets, and combinatorics." },
            { name: "Operating Systems", description: "Processes, memory, and file systems." },
            { name: "Computer Networks", description: "Network models and protocols." },
            { name: "Software Engineering", description: "Software development lifecycle." }
        ]
    },
    {
        semester: 4,
        subjects: [
            { name: "Algorithms Design", description: "Sorting, searching, and complexity analysis." },
            { name: "DBMS", description: "Relational databases and SQL." },
            { name: "Theory of Computation", description: "Automata and formal languages." },
            { name: "Microprocessors", description: "Assembly language programming." },
            { name: "Web Development", description: "HTML, CSS, JS and basic backends." }
        ]
    },
    {
        semester: 5,
        subjects: [
            { name: "Artificial Intelligence", description: "Search, logic, and basic AI." },
            { name: "Compiler Design", description: "Lexical analysis and parsing." },
            { name: "Computer Graphics", description: "2D/3D transformations and rendering." },
            { name: "Advanced Web Technologies", description: "React, Node.js, and frameworks." },
            { name: "Machine Learning", description: "Supervised and unsupervised learning." }
        ]
    },
    {
        semester: 6,
        subjects: [
            { name: "Deep Learning", description: "Neural networks and deep architectures." },
            { name: "Cryptography", description: "Encryption and network security." },
            { name: "Distributed Systems", description: "Consistency, replication, and consensus." },
            { name: "Data Science", description: "Data analysis and visualization." },
            { name: "Cloud Computing", description: "AWS, Azure, and virtualization." }
        ]
    },
    {
        semester: 7,
        subjects: [
            { name: "Big Data Analytics", description: "Hadoop, Spark, and large scale data." },
            { name: "Internet of Things", description: "Sensors, actuators, and smart systems." },
            { name: "Blockchain Technology", description: "Distributed ledgers and smart contracts." },
            { name: "Natural Language Processing", description: "Text processing and LLMs." },
            { name: "Project Phase I", description: "Initial phase of the final year project." }
        ]
    },
    {
        semester: 8,
        subjects: [
            { name: "Project Phase II", description: "Final implementation and thesis." },
            { name: "Cyber Security", description: "Advanced security threats and defense." },
            { name: "Ethics in IT", description: "Professional ethics and laws." },
            { name: "Entrepreneurship", description: "Business basics for tech startups." },
            { name: "Virtual Reality", description: "VR/AR basics and applications." }
        ]
    }
];

// Add 3-6 units for each subject
semestersData.forEach(sem => {
    sem.subjects.forEach(sub => {
        const numUnits = Math.floor(Math.random() * 4) + 3; // 3 to 6
        sub.units = [];
        for (let i = 1; i <= numUnits; i++) {
            const types = ['video', 'ppt', 'notes'];
            const type = types[Math.floor(Math.random() * types.length)];
            sub.units.push({
                title: `Unit ${i}: ${sub.name} Basics`,
                contentType: type,
                contentUrl: '#',
                duration: `${Math.floor(Math.random() * 30) + 10} min`,
                isCompleted: false
            });
        }
    });
});

async function seed() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB connected');

        await Course.deleteMany({});
        console.log('Cleared existing courses');

        await Course.insertMany(semestersData);
        console.log('Successfully seeded 8 semesters with subjects and units');

        mongoose.connection.close();
    } catch (err) {
        console.error('Error seeding DB:', err);
        mongoose.connection.close();
    }
}

seed();
