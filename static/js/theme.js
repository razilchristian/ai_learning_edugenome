// EduGenome Theme Loader
// Must run BEFORE body renders to prevent flash of wrong theme
(function() {
  var theme = localStorage.getItem('edugenome-theme') || 'purple';
  document.documentElement.setAttribute('data-theme', theme);
})();
