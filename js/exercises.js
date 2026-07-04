(function() {
  // 이름 입력 모달 공용 헬퍼. onSave(value)가 false를 반환하면 모달이 닫히지 않는다.
  function openNameModal(title, initialValue, onSave) {
    FitLog.ui.modal({
      title: title,
      bodyHTML: '<input type="text" class="modal-input" autocomplete="off">',
      onConfirm: function() {
        const input = document.querySelector('#modal-root .modal-input');
        const value = input ? input.value.trim() : '';
        return onSave(value);
      }
    });

    // value는 property로 대입(속성/HTML 문자열이 아님)하여 이스케이프 없이 안전하게 채운다.
    const input = document.querySelector('#modal-root .modal-input');
    if (input) {
      if (initialValue) {
        input.value = initialValue;
      }
      input.focus();
      input.select();
    }
  }

  FitLog.exercises = {
    // onSelect(exerciseName)을 호출한 뒤 오버레이를 닫는다.
    openPicker(onSelect) {
      let currentPartId = null;

      const overlay = document.createElement('div');
      overlay.className = 'picker-overlay';
      document.body.appendChild(overlay);

      function close() {
        overlay.remove();
      }

      function buildItem(name, onClick, onEdit, onDelete) {
        const item = document.createElement('div');
        item.className = 'list-item picker-item';

        const nameBtn = document.createElement('button');
        nameBtn.type = 'button';
        nameBtn.className = 'picker-item-name';
        nameBtn.textContent = name;
        nameBtn.addEventListener('click', onClick);

        const actions = document.createElement('div');
        actions.className = 'picker-item-actions';

        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'icon-btn';
        editBtn.textContent = '✏️';
        editBtn.setAttribute('aria-label', '이름 수정');
        editBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          onEdit();
        });

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'icon-btn';
        delBtn.textContent = '🗑'; // 🗑
        delBtn.setAttribute('aria-label', '삭제');
        delBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          onDelete();
        });

        actions.appendChild(editBtn);
        actions.appendChild(delBtn);
        item.appendChild(nameBtn);
        item.appendChild(actions);
        return item;
      }

      function render() {
        const db = FitLog.storage.getExerciseDB();
        overlay.innerHTML = '';

        const header = document.createElement('div');
        header.className = 'picker-header';

        const backBtn = document.createElement('button');
        backBtn.type = 'button';
        backBtn.className = 'picker-back-btn';
        backBtn.textContent = '←';
        backBtn.setAttribute('aria-label', '뒤로가기');
        backBtn.addEventListener('click', function() {
          if (currentPartId !== null) {
            currentPartId = null;
            render();
          } else {
            close();
          }
        });

        const titleEl = document.createElement('h3');
        titleEl.className = 'picker-title';

        header.appendChild(backBtn);
        header.appendChild(titleEl);
        overlay.appendChild(header);

        const listEl = document.createElement('div');
        listEl.className = 'picker-list card';
        overlay.appendChild(listEl);

        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'btn btn-primary picker-add-btn';

        if (currentPartId === null) {
          // 부위 선택 화면
          titleEl.textContent = '부위 선택';
          addBtn.textContent = '+ 부위 추가';

          if (db.bodyParts.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'picker-empty';
            empty.textContent = '등록된 부위가 없습니다';
            listEl.appendChild(empty);
          }

          db.bodyParts.forEach(function(part) {
            listEl.appendChild(buildItem(
              part.name,
              function() { currentPartId = part.id; render(); },
              function() { editPart(part); },
              function() { deletePart(part); }
            ));
          });

          addBtn.addEventListener('click', function() { addPart(); });
        } else {
          // 종목 선택 화면
          const part = db.bodyParts.find(function(p) { return p.id === currentPartId; });
          if (!part) {
            currentPartId = null;
            render();
            return;
          }

          titleEl.textContent = part.name + ' 종목 선택';
          addBtn.textContent = '+ 종목 추가';

          if (part.exercises.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'picker-empty';
            empty.textContent = '등록된 종목이 없습니다';
            listEl.appendChild(empty);
          }

          part.exercises.forEach(function(ex) {
            listEl.appendChild(buildItem(
              ex.name,
              function() {
                onSelect(ex.name);
                close();
              },
              function() { editExercise(part, ex); },
              function() { deleteExercise(part, ex); }
            ));
          });

          addBtn.addEventListener('click', function() { addExercise(part); });
        }

        overlay.appendChild(addBtn);
      }

      function addPart() {
        openNameModal('부위 추가', '', function(value) {
          if (!value) {
            FitLog.ui.toast('이름을 입력해주세요');
            return false;
          }
          const db = FitLog.storage.getExerciseDB();
          if (db.bodyParts.some(function(p) { return p.name === value; })) {
            FitLog.ui.toast('이미 존재하는 이름입니다');
            return false;
          }
          db.bodyParts.push({ id: FitLog.storage.uuid(), name: value, exercises: [] });
          FitLog.storage.saveExerciseDB(db);
          render();
          return true;
        });
      }

      function editPart(part) {
        openNameModal('부위 이름 수정', part.name, function(value) {
          if (!value) {
            FitLog.ui.toast('이름을 입력해주세요');
            return false;
          }
          const db = FitLog.storage.getExerciseDB();
          if (db.bodyParts.some(function(p) { return p.id !== part.id && p.name === value; })) {
            FitLog.ui.toast('이미 존재하는 이름입니다');
            return false;
          }
          const target = db.bodyParts.find(function(p) { return p.id === part.id; });
          if (!target) return true;
          target.name = value;
          FitLog.storage.saveExerciseDB(db);
          render();
          return true;
        });
      }

      function deletePart(part) {
        FitLog.ui.confirm('부위와 하위 종목이 모두 삭제됩니다. "' + part.name + '"을(를) 삭제할까요?', function() {
          const db = FitLog.storage.getExerciseDB();
          db.bodyParts = db.bodyParts.filter(function(p) { return p.id !== part.id; });
          FitLog.storage.saveExerciseDB(db);
          render();
        });
      }

      function addExercise(part) {
        openNameModal('종목 추가', '', function(value) {
          if (!value) {
            FitLog.ui.toast('이름을 입력해주세요');
            return false;
          }
          const db = FitLog.storage.getExerciseDB();
          const target = db.bodyParts.find(function(p) { return p.id === part.id; });
          if (!target) return true;
          if (target.exercises.some(function(e) { return e.name === value; })) {
            FitLog.ui.toast('이미 존재하는 이름입니다');
            return false;
          }
          target.exercises.push({ id: FitLog.storage.uuid(), name: value });
          FitLog.storage.saveExerciseDB(db);
          render();
          return true;
        });
      }

      function editExercise(part, ex) {
        openNameModal('종목 이름 수정', ex.name, function(value) {
          if (!value) {
            FitLog.ui.toast('이름을 입력해주세요');
            return false;
          }
          const db = FitLog.storage.getExerciseDB();
          const target = db.bodyParts.find(function(p) { return p.id === part.id; });
          if (!target) return true;
          if (target.exercises.some(function(e) { return e.id !== ex.id && e.name === value; })) {
            FitLog.ui.toast('이미 존재하는 이름입니다');
            return false;
          }
          const exTarget = target.exercises.find(function(e) { return e.id === ex.id; });
          if (!exTarget) return true;
          exTarget.name = value;
          FitLog.storage.saveExerciseDB(db);
          render();
          return true;
        });
      }

      function deleteExercise(part, ex) {
        FitLog.ui.confirm('"' + ex.name + '" 종목을 삭제할까요?', function() {
          const db = FitLog.storage.getExerciseDB();
          const target = db.bodyParts.find(function(p) { return p.id === part.id; });
          if (target) {
            target.exercises = target.exercises.filter(function(e) { return e.id !== ex.id; });
            FitLog.storage.saveExerciseDB(db);
          }
          render();
        });
      }

      render();
    }
  };
})();
