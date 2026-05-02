// EduGenome Theme Loader — Role-Isolated
// Runs BEFORE body renders to prevent flash of wrong theme
(function() {
  var role = localStorage.getItem('edugenome-role') || 'student';
  var theme = localStorage.getItem('theme_' + role) || 'purple';
  document.documentElement.setAttribute('data-theme', theme);
})();

// Mobile sidebar utilities — expose global toggle and outside-click handler
window.toggleSidebar = function() {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;
  // Toggle both classes to stay compatible with existing templates
  sidebar.classList.toggle('open');
  sidebar.classList.toggle('active');
};

// Close sidebar when clicking outside (mobile behavior)
document.addEventListener('click', (e) => {
  const sidebar = document.querySelector('.sidebar');
  const menuBtn = document.querySelector('.mobile-menu-btn');
  if (!sidebar || !menuBtn) return;
  if (menuBtn.contains(e.target)) return; // menu button click handled elsewhere
  if (sidebar.classList.contains('open') && !sidebar.contains(e.target)) {
    sidebar.classList.remove('open');
    sidebar.classList.remove('active');
  }
});
