window.FitLog = {};

FitLog.ui = {
  switchTab(tabId) {
    document.querySelectorAll('.tab-panel').forEach(p =>
      p.classList.toggle('active', p.id === 'tab-' + tabId));
    document.querySelectorAll('.tab-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.tab === tabId));
    // 이후 태스크에서 탭별 onShow 렌더 호출 추가
  },
  toast(message) {
    const el = document.getElementById('toast');
    el.textContent = message;
    el.hidden = false;
    clearTimeout(this._toastTimer);
    clearTimeout(this._toastHideTimer);
    void el.offsetWidth; // force reflow so the transition runs
    el.classList.add('show');
    this._toastTimer = setTimeout(() => {
      el.classList.remove('show');
      // hide from layout after fade-out completes
      clearTimeout(this._toastHideTimer);
      this._toastHideTimer = setTimeout(() => { el.hidden = true; }, 250);
    }, 2000);
  }
};
