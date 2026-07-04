document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      FitLog.ui.switchTab(this.dataset.tab);
    });
  });
});
