const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'templates');

// 1. student_dashboard.html
let p1 = path.join(dir, 'student_dashboard.html');
let c1 = fs.readFileSync(p1, 'utf8');
c1 = c1.replace(/Welcome back, Razil Christian!/g, 'Welcome back, <%= user.name %>!');
fs.writeFileSync(p1, c1);

// 2. teacher_dashboard.html
let p2 = path.join(dir, 'teacher_dashboard.html');
let c2 = fs.readFileSync(p2, 'utf8');
c2 = c2.replace(/Welcome back, Prof\. Smith!/g, 'Welcome back, <%= user.name %>!');
fs.writeFileSync(p2, c2);

// 3. gamification.html
let p3 = path.join(dir, 'gamification.html');
let c3 = fs.readFileSync(p3, 'utf8');
c3 = c3.replace(/Razil Christian(.*?<span class="badge badge-primary ml-2">You<\/span>)/g, '<%= user.name %>$1');
fs.writeFileSync(p3, c3);

// 4. settings.html
let p4 = path.join(dir, 'settings.html');
let c4 = fs.readFileSync(p4, 'utf8');
c4 = c4.replace(/Riya Chavda/g, '<%= user.name %>');
c4 = c4.replace(/<p style="font-size:11px;color:#a5b4fc">Student<\/p>/g, '<p style="font-size:11px;color:#a5b4fc"><%= user.role.charAt(0).toUpperCase() + user.role.slice(1) %></p>');
c4 = c4.replace(/<input class="input" value="Riya">/g, '<input class="input" value="<%= user.name.split(\' \')[0] || \'\' %>">');
c4 = c4.replace(/<input class="input" value="Chavda">/g, '<input class="input" value="<%= user.name.split(\' \').slice(1).join(\' \') || \'\' %>">');
c4 = c4.replace(/<input class="input" value="riya\.chavda@student\.edu" type="email">/g, '<input class="input" value="<%= user.email %>" type="email">');
fs.writeFileSync(p4, c4);

console.log('Update complete.');
