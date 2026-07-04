window.FitLog = {};

FitLog.ui = {
  switchTab(tabId) {
    document.querySelectorAll('.tab-panel').forEach(p =>
      p.classList.toggle('active', p.id === 'tab-' + tabId));
    document.querySelectorAll('.tab-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.tab === tabId));
    // 탭별 onShow 렌더: 필요한 탭 모듈이 로드되어 있으면 표시 시점에 다시 그린다.
    if (tabId === 'workout' && FitLog.workout) FitLog.workout.render();
    if (tabId === 'body' && FitLog.body) FitLog.body.render();
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
  },

  // { title, bodyHTML, onConfirm } — onConfirm이 false를 반환하면 모달을 닫지 않는다(유효성 실패).
  modal({ title, bodyHTML, onConfirm, confirmText, cancelText }) {
    const root = document.getElementById('modal-root');
    root.innerHTML = '';

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const card = document.createElement('div');
    card.className = 'modal-card';

    const titleEl = document.createElement('h3');
    titleEl.className = 'modal-title';
    titleEl.textContent = title || '';

    const body = document.createElement('div');
    body.className = 'modal-body';
    body.innerHTML = bodyHTML || '';

    const actions = document.createElement('div');
    actions.className = 'modal-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn';
    cancelBtn.textContent = cancelText || '취소';

    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = 'btn btn-primary';
    confirmBtn.textContent = confirmText || '확인';

    const close = () => {
      root.innerHTML = '';
      root.hidden = true;
    };

    const doConfirm = () => {
      const result = typeof onConfirm === 'function' ? onConfirm() : true;
      if (result !== false) {
        close();
      }
    };

    cancelBtn.addEventListener('click', close);
    confirmBtn.addEventListener('click', doConfirm);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    // Enter 키로 확인: 모달 안의 텍스트 입력에서 동작.
    body.querySelectorAll('input[type="text"]').forEach((input) => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          doConfirm();
        }
      });
    });

    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);
    card.appendChild(titleEl);
    card.appendChild(body);
    card.appendChild(actions);
    overlay.appendChild(card);
    root.appendChild(overlay);
    root.hidden = false;

    const firstInput = body.querySelector('input[type="text"]');
    if (firstInput) {
      firstInput.focus();
    }

    return { close };
  },

  // 삭제 등 단순 확인용. message는 텍스트로만 표시되어 별도 이스케이프가 필요 없다.
  confirm(message, onYes) {
    const p = document.createElement('p');
    p.className = 'modal-message';
    p.textContent = message;

    this.modal({
      title: '확인',
      bodyHTML: p.outerHTML,
      onConfirm: () => {
        if (typeof onYes === 'function') onYes();
        return true;
      }
    });
  }
};
