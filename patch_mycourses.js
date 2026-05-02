const fs = require('fs');
const file = 'templates/mycourses.html';
let content = fs.readFileSync(file, 'utf8');

const regex = /<div class="course-grid" id="courseGrid">[\s\S]*?<!-- No results message -->/m;

const replacement = `<div class="course-grid" id="courseGrid">
        <p>Loading semesters...</p>
      </div>

<script>
// Fetch Semesters Dynamically
fetch('/api/semesters')
  .then(res => res.json())
  .then(data => {
    const grid = document.getElementById('courseGrid');
    grid.innerHTML = '';
    
    if(data.length === 0) {
       document.getElementById('noResults').style.display = 'block';
       return;
    }

    data.forEach(sem => {
      let totalUnits = 0;
      let completedUnits = 0;
      
      sem.subjects.forEach(sub => {
        totalUnits += sub.units.length;
        completedUnits += sub.units.filter(u => u.isCompleted).length;
      });
      
      const progress = totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0;
      const subjectsCount = sem.subjects.length;
      
      const icons = ['📘', '🚀', '🧠', '⚙️', '🌐', '📊', '⚡', '🎓'];
      const icon = icons[(sem.semester - 1) % icons.length];
      
      const card = document.createElement('div');
      card.className = 'course-card';
      card.onclick = () => window.location.href = \`/semester?id=\${sem.semester}\`;
      
      card.innerHTML = \`
        <div class="course-banner" style="background:var(--header-bg)">
          <div class="course-banner-icon">\${icon}</div>
        </div>
        <div style="padding:16px">
          <div class="flex items-start justify-between mb-2">
            <div>
              <h3 class="font-semibold" style="font-size:15px;color:#1e1b4b">Semester \${sem.semester}</h3>
              <p class="text-xs text-muted mt-1">\${subjectsCount} Subjects</p>
            </div>
          </div>
          <div class="mb-3 mt-4">
            <div class="flex justify-between mb-1"><span class="text-xs text-muted">Progress</span><span class="text-xs font-bold text-primary">\${progress}%</span></div>
            <div class="progress" style="height:6px"><div class="progress-bar" style="width:\${progress}%"></div></div>
          </div>
        </div>
      \`;
      
      grid.appendChild(card);
    });
  })
  .catch(err => console.error('Error fetching semesters:', err));
</script>

      <!-- No results message -->`;

content = content.replace(regex, replacement);
fs.writeFileSync(file, content);
console.log('Replaced course grid with dynamic semantic courses script.');
