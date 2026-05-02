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

const seedCourses = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB connected');

        await Course.deleteMany({});
        console.log('Cleared existing courses');

        const sampleCourses = [
            {
                title: "Computer Networks",
                description: "Learn the fundamentals of computer networking, protocols, and architecture.",
                chapters: [
                    {
                        title: "Introduction to Computer Networks",
                        units: [
                            {
                                title: "Network Basics",
                                videoUrl: "/videos/unit1-algorithm.mp4",
                                pdfUrl: "/pdfs/unit1-algorithm.pdf",
                                quiz: [
                                    {
                                        question: "What does LAN stand for?",
                                        options: ["Local Area Network", "Large Area Network", "Logical Area Network", "Light Area Network"],
                                        answer: "Local Area Network"
                                    }
                                ]
                            },
                            {
                                title: "OSI Model",
                                videoUrl: "/videos/unit1-algorithm.mp4",
                                pdfUrl: "/pdfs/unit1-algorithm.pdf",
                                quiz: [
                                    {
                                        question: "How many layers are in the OSI model?",
                                        options: ["5", "6", "7", "8"],
                                        answer: "7"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        title: "Network Layer",
                        units: [
                            {
                                title: "IP Addressing",
                                videoUrl: "/videos/unit1-algorithm.mp4",
                                pdfUrl: "/pdfs/unit1-algorithm.pdf",
                                quiz: []
                            }
                        ]
                    }
                ]
            },
            {
                title: "Data Structures and Algorithms",
                description: "Master problem solving and core computer science data structures.",
                chapters: [
                    {
                        title: "Arrays and Linked Lists",
                        units: [
                            {
                                title: "Introduction to Arrays",
                                videoUrl: "/videos/unit1-algorithm.mp4",
                                pdfUrl: "/pdfs/unit1-algorithm.pdf",
                                quiz: []
                            }
                        ]
                    }
                ]
            }
        ];

        await Course.insertMany(sampleCourses);
        console.log('Successfully seeded EdTech courses!');
        process.exit(0);
    } catch (err) {
        console.error('Seeding error:', err);
        process.exit(1);
    }
};

seedCourses();
