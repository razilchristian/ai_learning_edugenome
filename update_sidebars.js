const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'templates');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

for (const file of files) {
  let content = fs.readFileSync(path.join(dir, file), 'utf8');
  
  if (content.includes('sidebar-nav') && !content.includes('manage-quiz') && !content.includes('/quiz')) {
    
    // Check if it's a teacher/admin page by checking links
    if (content.includes('href="/teacher"') || content.includes('href="/admin"')) {
      // Try to inject after mycourseteacher
      if (content.includes('href="/mycourseteacher"')) {
        content = content.replace(
          /<a href="\/mycourseteacher".*?<\/button><\/a>/,
          match => `${match}\n        <a href="/manage-quiz"><button class="nav-btn"><i data-lucide="clock" style="width:16px;height:16px"></i>Manage Quiz</button></a>`
        );
      } else if (content.includes('Course Management')) {
        content = content.replace(
          /<a href="\/admin"><button class="nav-btn"><i data-lucide="book-open".*?<\/button><\/a>/,
          match => `${match}\n        <a href="/manage-quiz"><button class="nav-btn"><i data-lucide="clock" style="width:16px;height:16px"></i>Manage Quiz</button></a>`
        );
      }
    } else {
      // Student page
      if (content.includes('href="/mycourses"')) {
        content = content.replace(
          /<a href="\/mycourses".*?<\/button><\/a>/,
          match => `${match}\n        <a href="/quiz"><button class="nav-btn"><i data-lucide="clock" style="width:16px;height:16px"></i>Quiz</button></a>`
        );
      }
    }
    fs.writeFileSync(path.join(dir, file), content);
    console.log(`Updated ${file}`);
  }
}
