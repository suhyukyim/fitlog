// 루틴 탭: 루틴 템플릿 목록/생성/수정/삭제 + 기록 탭에서의 적용(불러오기).
//
// 편집 화면 설계 메모(z-index 제약):
// FitLog.ui.modal()은 z-index 400, FitLog.exercises.openPicker()는 z-index 300이다.
// 만약 루틴 편집 화면을 modal()로 만들면, 그 위에서 openPicker()를 열어도 picker(300)가
// modal(400)보다 아래에 깔려 보이지 않는다. 따라서 루틴 편집 화면은 modal을 쓰지 않고
// picker-overlay와 같은 패턴의 전용 풀스크린 오버레이(`.routine-editor-overlay`, z-index 250)로
// 구현한다. 250 < 300 이므로 편집 화면 위에서 openPicker를 열면 항상 정상적으로 그 위에 뜬다.
(function() {
  FitLog.routines = {
    render: renderList,
    openApplyPicker: openApplyPicker
  };

  // ---------- 루틴 목록 ----------

  function renderList() {
    const area = document.getElementById('routines-list-area');
    if (!area) return;
    area.innerHTML = '';

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn btn-primary routines-add-btn';
    addBtn.textContent = '+ 루틴 추가';
    addBtn.addEventListener('click', function() {
      openEditor(null);
    });
    area.appendChild(addBtn);

    const routines = FitLog.storage.getRoutines();

    if (routines.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'routines-empty';
      empty.textContent = '저장된 루틴이 없습니다';
      area.appendChild(empty);
      return;
    }

    routines.forEach(function(routine) {
      area.appendChild(buildCard(routine));
    });
  }

  function buildCard(routine) {
    const card = document.createElement('div');
    card.className = 'card routine-card';

    const header = document.createElement('div');
    header.className = 'routine-card-header';

    const nameEl = document.createElement('span');
    nameEl.className = 'routine-name';
    nameEl.textContent = routine.name;

    const actions = document.createElement('div');
    actions.className = 'routine-card-actions';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'icon-btn';
    editBtn.textContent = '✏️';
    editBtn.setAttribute('aria-label', '루틴 수정');
    editBtn.addEventListener('click', function() {
      openEditor(routine);
    });

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'icon-btn';
    delBtn.textContent = '🗑';
    delBtn.setAttribute('aria-label', '루틴 삭제');
    delBtn.addEventListener('click', function() {
      FitLog.ui.confirm('"' + routine.name + '" 루틴을 삭제할까요?', function() {
        deleteRoutine(routine.id);
      });
    });

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    header.appendChild(nameEl);
    header.appendChild(actions);
    card.appendChild(header);

    const exList = document.createElement('div');
    exList.className = 'routine-exercise-list';
    exList.textContent = routine.exerciseNames.join(', ');
    card.appendChild(exList);

    return card;
  }

  function deleteRoutine(id) {
    let routines = FitLog.storage.getRoutines();
    routines = routines.filter(function(r) { return r.id !== id; });
    FitLog.storage.saveRoutines(routines);
    renderList();
  }

  // ---------- 생성/수정 편집 화면 (풀스크린 오버레이) ----------

  function openEditor(routine) {
    // 재진입 방지: 이미 편집 화면이 열려있으면 무시한다.
    if (document.querySelector('.routine-editor-overlay')) {
      return;
    }

    const isEdit = !!routine;
    const editId = isEdit ? routine.id : null;
    let name = isEdit ? routine.name : '';
    let exerciseNames = isEdit ? routine.exerciseNames.slice() : [];

    const overlay = document.createElement('div');
    overlay.className = 'routine-editor-overlay';
    document.body.appendChild(overlay);

    function close() {
      overlay.remove();
    }

    function render() {
      overlay.innerHTML = '';

      const header = document.createElement('div');
      header.className = 'picker-header';

      const backBtn = document.createElement('button');
      backBtn.type = 'button';
      backBtn.className = 'picker-back-btn';
      backBtn.textContent = '←';
      backBtn.setAttribute('aria-label', '뒤로가기');
      backBtn.addEventListener('click', close);

      const titleEl = document.createElement('h3');
      titleEl.className = 'picker-title';
      titleEl.textContent = isEdit ? '루틴 수정' : '새 루틴';

      header.appendChild(backBtn);
      header.appendChild(titleEl);
      overlay.appendChild(header);

      const nameLabel = document.createElement('label');
      nameLabel.className = 'form-label';
      nameLabel.textContent = '루틴 이름';
      nameLabel.setAttribute('for', 'routine-name-input');
      overlay.appendChild(nameLabel);

      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.id = 'routine-name-input';
      nameInput.className = 'body-input';
      nameInput.autocomplete = 'off';
      nameInput.value = name;
      nameInput.addEventListener('input', function() {
        name = nameInput.value;
      });
      overlay.appendChild(nameInput);

      const listLabel = document.createElement('div');
      listLabel.className = 'form-label';
      listLabel.textContent = '종목 목록';
      overlay.appendChild(listLabel);

      const listEl = document.createElement('div');
      listEl.className = 'picker-list card routine-editor-list';

      if (exerciseNames.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'picker-empty';
        empty.textContent = '추가된 종목이 없습니다';
        listEl.appendChild(empty);
      }

      exerciseNames.forEach(function(exName, idx) {
        const item = document.createElement('div');
        item.className = 'list-item';

        const label = document.createElement('span');
        label.textContent = exName;

        const rmBtn = document.createElement('button');
        rmBtn.type = 'button';
        rmBtn.className = 'icon-btn';
        rmBtn.textContent = '🗑';
        rmBtn.setAttribute('aria-label', '종목 제거');
        rmBtn.addEventListener('click', function() {
          exerciseNames.splice(idx, 1);
          render();
        });

        item.appendChild(label);
        item.appendChild(rmBtn);
        listEl.appendChild(item);
      });

      overlay.appendChild(listEl);

      const addExBtn = document.createElement('button');
      addExBtn.type = 'button';
      addExBtn.className = 'btn picker-add-btn';
      addExBtn.textContent = '+ 종목 추가';
      addExBtn.addEventListener('click', function() {
        // openPicker(z-index 300)는 이 오버레이(z-index 250)보다 위에 뜬다.
        FitLog.exercises.openPicker(function(exName) {
          if (exerciseNames.indexOf(exName) === -1) {
            exerciseNames.push(exName);
          }
          render();
        });
      });
      overlay.appendChild(addExBtn);

      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'btn btn-primary routine-save-btn';
      saveBtn.textContent = '저장';
      saveBtn.addEventListener('click', function() {
        handleSave(nameInput.value, exerciseNames);
      });
      overlay.appendChild(saveBtn);
    }

    function handleSave(rawName, names) {
      const trimmed = (rawName || '').trim();
      if (!trimmed) {
        FitLog.ui.toast('이름을 입력해주세요');
        return;
      }
      if (names.length === 0) {
        FitLog.ui.toast('종목을 1개 이상 추가해주세요');
        return;
      }

      const routines = FitLog.storage.getRoutines();
      const isDup = routines.some(function(r) {
        return r.id !== editId && r.name === trimmed;
      });
      if (isDup) {
        FitLog.ui.toast('이미 존재하는 루틴 이름입니다');
        return;
      }

      if (isEdit) {
        const target = routines.find(function(r) { return r.id === editId; });
        if (target) {
          target.name = trimmed;
          target.exerciseNames = names.slice();
        }
      } else {
        routines.push({ id: FitLog.storage.uuid(), name: trimmed, exerciseNames: names.slice() });
      }

      FitLog.storage.saveRoutines(routines);
      close();
      renderList();
      FitLog.ui.toast('저장했습니다');
    }

    render();

    const firstInput = overlay.querySelector('#routine-name-input');
    if (firstInput) {
      firstInput.focus();
    }
  }

  // ---------- 기록 탭: 루틴 불러오기 ----------

  // 저장된 루틴이 없으면 빈 모달 대신 토스트만 표시한다(브리프의 두 선택지 중 이 방식을 채택).
  function openApplyPicker() {
    const routines = FitLog.storage.getRoutines();
    if (routines.length === 0) {
      FitLog.ui.toast('저장된 루틴이 없습니다');
      return;
    }

    // 루틴 이름/종목명은 사용자 데이터이므로 textContent로만 채운 뒤 outerHTML을 얻어
    // (텍스트 노드 직렬화 시 자동 이스케이프됨) modal()의 bodyHTML로 전달한다.
    const container = document.createElement('div');
    container.className = 'apply-routine-list';
    routines.forEach(function(r, idx) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'apply-routine-item';
      item.dataset.idx = String(idx);

      const nameEl = document.createElement('span');
      nameEl.className = 'apply-routine-name';
      nameEl.textContent = r.name;

      const exEl = document.createElement('span');
      exEl.className = 'apply-routine-exercises';
      exEl.textContent = r.exerciseNames.join(', ');

      item.appendChild(nameEl);
      item.appendChild(exEl);
      container.appendChild(item);
    });

    const handle = FitLog.ui.modal({
      title: '루틴 불러오기',
      bodyHTML: container.outerHTML,
      confirmText: '닫기',
      cancelText: '닫기',
      onConfirm: function() { return true; }
    });

    document.querySelectorAll('#modal-root .apply-routine-item').forEach(function(btn) {
      btn.addEventListener('click', function() {
        const idx = Number(btn.dataset.idx);
        const routine = routines[idx];
        if (!routine) return;
        applyRoutine(routine);
        handle.close();
      });
    });
  }

  function applyRoutine(routine) {
    // addExercisesByNames(names, routineName)의 두 번째 인자로 세션의 routineName을
    // 함께 설정한다(별도 setter를 만들지 않고 기존 함수를 확장하는 쪽을 선택 — 세션 로직이
    // workout.js 한 곳에 남고, 저장/렌더 순서를 다시 조율할 필요가 없어 더 단순하다).
    FitLog.workout.addExercisesByNames(routine.exerciseNames, routine.name);
    FitLog.ui.toast('루틴을 적용했습니다');
  }
})();
