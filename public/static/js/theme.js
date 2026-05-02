// EduGenome Theme Loader — Role-Isolated
// Runs BEFORE body renders to prevent flash of wrong theme
(function() {
  var role = localStorage.getItem('edugenome-role') || 'student';
  var theme = localStorage.getItem('theme_' + role) || 'purple';
  document.documentElement.setAttribute('data-theme', theme);
})();
