document.addEventListener('DOMContentLoaded', function() {
  FitLog.storage.seedIfEmpty();

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      FitLog.ui.switchTab(this.dataset.tab);
    });
  });
});
