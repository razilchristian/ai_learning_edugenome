require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;

const CourseSchema = new mongoose.Schema({
    title: String,
    description: String,
    chapters: [
        {
            title: String,
            units: [
                {
                    title: String,
                    videoUrl: String,
                    pdfUrl: String,
                    quiz: [{ question: String, options: [String], answer: String }]
                }
            ]
        }
    ]
});

const Course = mongoose.models.Course || mongoose.model('Course', CourseSchema);

function q(question, options, answer) {
    return { question, options, answer };
}

// Unit WITHOUT media (most subjects — content not uploaded yet)
function unit(title) {
    return {
        title,
        videoUrl: "",
        pdfUrl: "",
        quiz: [
            q(`What is ${title}?`, ["Option A", "Option B", "Option C", "Option D"], "Option A")
        ]
    };
}

// Unit WITH real media (only for Algorithm subject)
function algoUnit(title) {
    return {
        title,
        videoUrl: "/videos/unit1-algorithm.mp4",
        pdfUrl: "/pdfs/unit1-algorithm.pdf",
        quiz: [
            q(`What is ${title}?`,
              ["A fundamental concept", "Not related to algorithms", "A hardware component", "None of the above"],
              "A fundamental concept")
        ]
    };
}

const semesters = [
    {
        title: "Semester 1 – Fundamentals",
        description: "Core foundations of computer science and programming.",
        chapters: [
            { title: "Programming Fundamentals", units: [unit("Variables & Data Types"), unit("Control Flow"), unit("Functions")] },
            { title: "Mathematics I", units: [unit("Sets & Logic"), unit("Relations & Functions")] },
            { title: "Digital Logic Design", units: [unit("Number Systems"), unit("Logic Gates"), unit("Boolean Algebra")] },
            { title: "Communication Skills", units: [unit("Technical Writing"), unit("Presentation Skills")] },
            { title: "Physics for Engineers", units: [unit("Mechanics"), unit("Waves & Optics")] },
            { title: "Environmental Science", units: [unit("Ecology Basics"), unit("Pollution Control")] },
        ]
    },
    {
        title: "Semester 2 – Core CS",
        description: "Building strong core computer science knowledge.",
        chapters: [
            { title: "Object-Oriented Programming", units: [unit("Classes & Objects"), unit("Inheritance"), unit("Polymorphism")] },
            { title: "Data Structures", units: [unit("Arrays & Linked Lists"), unit("Stacks & Queues"), unit("Trees & Graphs")] },
            { title: "Mathematics II", units: [unit("Calculus"), unit("Linear Algebra")] },
            { title: "Computer Organization", units: [unit("CPU Architecture"), unit("Memory Hierarchy")] },
            { title: "Discrete Mathematics", units: [unit("Graph Theory"), unit("Combinatorics")] },
            { title: "Electronics Basics", units: [unit("Semiconductors"), unit("Op-Amps")] },
            { title: "Professional Ethics", units: [unit("Ethics in IT"), unit("Cyber Laws")] },
        ]
    },
    {
        title: "Semester 3 – Systems & Algorithms",
        description: "Deep dive into algorithms and system-level programming.",
        chapters: [
            // ★ This is the ONLY subject with real video/PDF content
            { title: "Design & Analysis of Algorithms", units: [algoUnit("Sorting Algorithms"), algoUnit("Dynamic Programming"), algoUnit("Greedy Algorithms")] },
            { title: "Database Management Systems", units: [unit("SQL Fundamentals"), unit("Normalization"), unit("Transactions")] },
            { title: "Operating Systems", units: [unit("Process Management"), unit("Memory Management"), unit("File Systems")] },
            { title: "Computer Networks", units: [unit("OSI Model"), unit("TCP/IP"), unit("Routing Protocols")] },
            { title: "Web Development", units: [unit("HTML & CSS"), unit("JavaScript Basics"), unit("DOM Manipulation")] },
            { title: "Software Engineering", units: [unit("SDLC Models"), unit("Requirements Engineering")] },
        ]
    },
    {
        title: "Semester 4 – Advanced Programming",
        description: "Advanced programming paradigms and frameworks.",
        chapters: [
            { title: "Java Programming", units: [unit("Multithreading"), unit("Collections Framework"), unit("JDBC")] },
            { title: "Python Programming", units: [unit("Data Structures in Python"), unit("File Handling"), unit("Libraries & Packages")] },
            { title: "Theory of Computation", units: [unit("Finite Automata"), unit("Context-Free Grammars"), unit("Turing Machines")] },
            { title: "Computer Graphics", units: [unit("2D Transformations"), unit("3D Modeling")] },
            { title: "Microprocessors", units: [unit("8086 Architecture"), unit("Assembly Programming")] },
            { title: "Statistics & Probability", units: [unit("Probability Distributions"), unit("Hypothesis Testing")] },
            { title: "Technical Seminar", units: [unit("Research Methodology"), unit("Paper Presentation")] },
        ]
    },
    {
        title: "Semester 5 – Machine Learning & Security",
        description: "Introduction to AI/ML and cybersecurity.",
        chapters: [
            { title: "Machine Learning", units: [unit("Linear Regression"), unit("Classification"), unit("Clustering"), unit("Neural Networks")] },
            { title: "Information Security", units: [unit("Cryptography"), unit("Network Security"), unit("Firewalls")] },
            { title: "Compiler Design", units: [unit("Lexical Analysis"), unit("Parsing"), unit("Code Generation")] },
            { title: "Mobile App Development", units: [unit("Android Basics"), unit("UI Design"), unit("APIs & Networking")] },
            { title: "Cloud Computing", units: [unit("Virtualization"), unit("AWS Basics"), unit("Docker")] },
            { title: "Soft Skills & Leadership", units: [unit("Team Management"), unit("Communication")] },
        ]
    },
    {
        title: "Semester 6 – AI & Big Data",
        description: "Deep learning, big data processing, and real-world applications.",
        chapters: [
            { title: "Artificial Intelligence", units: [unit("Search Algorithms"), unit("Knowledge Representation"), unit("Expert Systems")] },
            { title: "Deep Learning", units: [unit("CNNs"), unit("RNNs"), unit("GANs")] },
            { title: "Big Data Analytics", units: [unit("Hadoop"), unit("Spark"), unit("MapReduce")] },
            { title: "Internet of Things", units: [unit("Sensors & Actuators"), unit("IoT Protocols"), unit("Smart Systems")] },
            { title: "DevOps Practices", units: [unit("CI/CD"), unit("Kubernetes"), unit("Monitoring")] },
            { title: "Data Visualization", units: [unit("Matplotlib"), unit("D3.js"), unit("Dashboard Design")] },
            { title: "Mini Project", units: [unit("Project Planning"), unit("Implementation")] },
        ]
    },
    {
        title: "Semester 7 – Specialization",
        description: "Advanced specialization tracks and industry practices.",
        chapters: [
            { title: "Natural Language Processing", units: [unit("Text Processing"), unit("Sentiment Analysis"), unit("Transformers")] },
            { title: "Blockchain Technology", units: [unit("Distributed Ledger"), unit("Smart Contracts"), unit("Ethereum")] },
            { title: "Computer Vision", units: [unit("Image Processing"), unit("Object Detection"), unit("Face Recognition")] },
            { title: "Advanced Databases", units: [unit("NoSQL"), unit("MongoDB"), unit("Graph Databases")] },
            { title: "Software Testing", units: [unit("Unit Testing"), unit("Integration Testing"), unit("Automation")] },
            { title: "Entrepreneurship", units: [unit("Startup Basics"), unit("Business Models")] },
            { title: "Internship / Industry Training", units: [unit("Industry Exposure"), unit("Report Writing")] },
        ]
    },
    {
        title: "Semester 8 – Capstone & Research",
        description: "Final year project, research, and career preparation.",
        chapters: [
            { title: "Major Project", units: [unit("Problem Statement"), unit("System Design"), unit("Implementation"), unit("Testing & Deployment")] },
            { title: "Research Methodology", units: [unit("Literature Review"), unit("Research Design"), unit("Data Analysis")] },
            { title: "Emerging Technologies", units: [unit("Quantum Computing"), unit("Edge Computing"), unit("Web3")] },
            { title: "Data Science Capstone", units: [unit("EDA"), unit("Feature Engineering"), unit("Model Deployment")] },
            { title: "Career Development", units: [unit("Resume Building"), unit("Interview Prep"), unit("Portfolio")] },
            { title: "Ethics in AI", units: [unit("Bias in AI"), unit("Responsible AI"), unit("Regulations")] },
        ]
    }
];

const seed = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB connected');

        await Course.deleteMany({});
        console.log('Cleared existing courses');

        await Course.insertMany(semesters);
        console.log(`Seeded ${semesters.length} semesters with ${semesters.reduce((a,s) => a + s.chapters.length, 0)} total subjects!`);
        process.exit(0);
    } catch (err) {
        console.error('Seeding error:', err);
        process.exit(1);
    }
};

seed();
