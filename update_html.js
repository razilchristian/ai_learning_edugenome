const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'templates');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

for (let file of files) {
  if (file === 'login.html' || file === 'landing.html') continue;
  let p = path.join(dir, file);
  let content = fs.readFileSync(p, 'utf8');
  
  if (!content.includes('mobile-menu-btn')) {
    content = content.replace(
      '<header class="top-header">',
      '<header class="top-header">\n      <button class="mobile-menu-btn" onclick="document.querySelector(\'.sidebar\').classList.toggle(\'open\')"><i data-lucide="menu" style="width:24px;height:24px"></i></button>'
    );
    // Let's also ensure clicking anywhere outside the sidebar closes it
    if (!content.includes('sidebar.classList.remove')) {
      content = content.replace('</body>', `
<script>
  document.addEventListener('click', (e) => {
    const sidebar = document.querySelector('.sidebar');
    const menuBtn = document.querySelector('.mobile-menu-btn');
    if (sidebar && sidebar.classList.contains('open') && !sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  });
</script>
</body>`);
    }
    fs.writeFileSync(p, content);
  }
}
console.log('Done');
