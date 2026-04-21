const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const db = new sqlite3.Database(path.resolve(__dirname, 'database.sqlite'));

async function seed() {
    const password = await bcrypt.hash('password123', 10);
    
    db.serialize(() => {
        const stmt = db.prepare(`INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`);
        
        // Ignore unique constraint errors silently for seeding
        stmt.run('Riya Chavda', 'student@example.com', password, 'student', (err) => {});
        stmt.run('Teacher Jane', 'teacher@example.com', password, 'teacher', (err) => {});
        
        stmt.finalize(() => {
            console.log('Seed completed!');
            db.close();
        });
    });
}

seed();
