const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('database.sqlite');

// 🔥 UPDATE ROLES

db.run(
    `UPDATE users SET role = 'student' WHERE email = 'razilchristian@gmail.com'`,
    function (err) {
        if (err) console.error(err);
        else console.log("Student role fixed");
    }
);

db.run(
    `UPDATE users SET role = 'teacher' WHERE email = 'razilchristian1@gmail.com'`,
    function (err) {
        if (err) console.error(err);
        else console.log("Teacher role fixed");
    }
);

// 🔍 CHECK RESULT
db.all(`SELECT email, role FROM users`, (err, rows) => {
    if (err) console.error(err);
    else console.log(rows);
});