document.addEventListener('DOMContentLoaded', function() {
  FitLog.storage.seedIfEmpty();

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      FitLog.ui.switchTab(this.dataset.tab);
    });
  });

  // 임시 테스트 훅 (Task 4에서 실제 UI로 교체하며 제거)
  const testPickerBtn = document.getElementById('test-picker-btn');
  if (testPickerBtn) {
    testPickerBtn.addEventListener('click', function() {
      FitLog.exercises.openPicker(function(name) {
        FitLog.ui.toast(name);
      });
    });
  }
});
