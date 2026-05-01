const fs = require('fs');
const path = require('path');

const templatesDir = path.join(__dirname, 'templates');
const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.html'));

const roleInjection = `localStorage.setItem('edugenome-role', u.role || 'student');`;

let count = 0;
for (const file of files) {
  const filePath = path.join(templatesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Skip if already has role injection
  if (content.includes("edugenome-role")) {
    console.log(`Skipped ${file} (already has role injection)`);
    continue;
  }
  
  // Find fetch('/api/me') blocks and inject role saving after the fetch line
  if (content.includes("/api/me")) {
    // Inject after: .then(u => {
    content = content.replace(
      /fetch\(['"]\/api\/me['"]\)\.then\(r\s*=>\s*r\.json\(\)\)\.then\(u\s*=>\s*\{/g,
      (match) => match + '\n      ' + roleInjection
    );
    fs.writeFileSync(filePath, content);
    console.log(`Injected role saving into ${file}`);
    count++;
  }
}

// Also inject into pages that DON'T have /api/me but need role detection
// For these, add a small fetch block before </body>
for (const file of files) {
  const filePath = path.join(templatesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes("edugenome-role")) continue;
  if (content.includes("login") || content.includes("landing")) continue; // skip auth pages
  
  // Add a role-fetch script before </body>
  const roleScript = `
<script>
  fetch('/api/me').then(r => r.json()).then(u => {
    localStorage.setItem('edugenome-role', u.role || 'student');
    // Re-apply theme after role is known
    var theme = localStorage.getItem('theme_' + (u.role || 'student')) || 'purple';
    document.documentElement.setAttribute('data-theme', theme);
  }).catch(() => {});
</script>`;
  
  content = content.replace('</body>', roleScript + '\n</body>');
  fs.writeFileSync(filePath, content);
  console.log(`Added role-fetch block to ${file}`);
  count++;
}

console.log(`\nDone! ${count} files updated.`);
