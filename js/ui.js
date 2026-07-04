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
    el.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      el.classList.remove('show');
      el.hidden = true;
    }, 2000);
  }
};
