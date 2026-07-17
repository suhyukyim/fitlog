document.addEventListener('DOMContentLoaded', function() {
  FitLog.storage.seedIfEmpty();
  FitLog.storage.migrateExerciseTypes();
  FitLog.workout.init();

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      FitLog.ui.switchTab(this.dataset.tab);
    });
  });
});
