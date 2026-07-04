(function() {
  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function toDateStr(year, month0, day) {
    // month0: 0-기반 월
    return year + '-' + pad2(month0 + 1) + '-' + pad2(day);
  }

  const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

  FitLog.workout = {
    calYear: null,
    calMonth: null, // 0-기반
    selectedDate: null,

    init: function() {
      const today = FitLog.storage.todayStr();
      const parts = today.split('-').map(Number);
      this.calYear = parts[0];
      this.calMonth = parts[1] - 1;
      this.selectedDate = today;
      this.render();
    },

    render: function() {
      renderCalendar(this);
      renderSession(this);
    },

    addExercisesByNames: function(names) {
      addExercisesByNames(this, names);
    }
  };

  // ---------- 달력 ----------

  function renderCalendar(workout) {
    const calEl = document.getElementById('calendar');
    if (!calEl) return;
    calEl.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'cal-header';

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'cal-nav-btn';
    prevBtn.textContent = '◀';
    prevBtn.setAttribute('aria-label', '이전 달');
    prevBtn.addEventListener('click', function() {
      changeMonth(workout, -1);
    });

    const titleEl = document.createElement('div');
    titleEl.className = 'cal-title';
    titleEl.textContent = workout.calYear + '년 ' + (workout.calMonth + 1) + '월';

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'cal-nav-btn';
    nextBtn.textContent = '▶';
    nextBtn.setAttribute('aria-label', '다음 달');
    nextBtn.addEventListener('click', function() {
      changeMonth(workout, 1);
    });

    header.appendChild(prevBtn);
    header.appendChild(titleEl);
    header.appendChild(nextBtn);
    calEl.appendChild(header);

    const wdRow = document.createElement('div');
    wdRow.className = 'cal-grid';
    WEEKDAYS.forEach(function(w) {
      const d = document.createElement('div');
      d.className = 'cal-weekday';
      d.textContent = w;
      wdRow.appendChild(d);
    });
    calEl.appendChild(wdRow);

    const grid = document.createElement('div');
    grid.className = 'cal-grid';

    const firstDay = new Date(workout.calYear, workout.calMonth, 1).getDay();
    const daysInMonth = new Date(workout.calYear, workout.calMonth + 1, 0).getDate();
    const todayStr = FitLog.storage.todayStr();
    const recordDates = new Set(
      FitLog.storage.getSessions()
        .filter(function(s) { return s.exercises.length > 0; })
        .map(function(s) { return s.date; })
    );

    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement('div');
      empty.className = 'cal-cell cal-empty';
      grid.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = toDateStr(workout.calYear, workout.calMonth, day);
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cal-cell cal-day';
      if (dateStr === todayStr) cell.classList.add('today');
      if (dateStr === workout.selectedDate) cell.classList.add('selected');
      if (recordDates.has(dateStr)) cell.classList.add('has-record');
      cell.textContent = String(day);
      cell.addEventListener('click', function() {
        workout.selectedDate = dateStr;
        workout.render();
      });
      grid.appendChild(cell);
    }

    calEl.appendChild(grid);
  }

  function changeMonth(workout, delta) {
    workout.calMonth += delta;
    if (workout.calMonth < 0) {
      workout.calMonth = 11;
      workout.calYear -= 1;
    } else if (workout.calMonth > 11) {
      workout.calMonth = 0;
      workout.calYear += 1;
    }
    renderCalendar(workout);
  }

  // ---------- 세션 영역 ----------

  function formatDateHeading(dateStr) {
    const todayStr = FitLog.storage.todayStr();
    if (dateStr === todayStr) return '오늘 기록';
    const parts = dateStr.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return parts[1] + '월 ' + parts[2] + '일 (' + WEEKDAYS[d.getDay()] + ') 기록';
  }

  function renderSession(workout) {
    const area = document.getElementById('session-area');
    if (!area) return;
    area.innerHTML = '';

    const sessions = FitLog.storage.getSessions();
    const session = sessions.find(function(s) { return s.date === workout.selectedDate; });

    const heading = document.createElement('h3');
    heading.className = 'session-heading';
    heading.textContent = formatDateHeading(workout.selectedDate);
    area.appendChild(heading);

    if (!session || session.exercises.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'session-empty';
      empty.textContent = '기록이 없습니다';
      area.appendChild(empty);
    } else {
      session.exercises.forEach(function(ex) {
        area.appendChild(buildExerciseCard(workout, session, ex));
      });
    }

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn btn-primary session-add-exercise-btn';
    addBtn.textContent = '+ 종목 추가';
    addBtn.addEventListener('click', function() {
      FitLog.exercises.openPicker(function(name) {
        addExercisesByNames(workout, [name]);
      });
    });
    area.appendChild(addBtn);
  }

  // 같은 이름 종목이 있는 세션 중 date < beforeDate인 가장 최근 세션에서 최고 무게 세트
  function findPreviousBest(name, beforeDate) {
    const sessions = FitLog.storage.getSessions();
    let bestSession = null;
    sessions.forEach(function(s) {
      if (s.date < beforeDate && s.exercises.some(function(e) { return e.name === name; })) {
        if (!bestSession || s.date > bestSession.date) bestSession = s;
      }
    });
    if (!bestSession) return null;
    const ex = bestSession.exercises.find(function(e) { return e.name === name; });
    if (!ex || ex.sets.length === 0) return null;
    let best = ex.sets[0];
    ex.sets.forEach(function(st) {
      if (st.weight > best.weight) best = st;
    });
    return best;
  }

  function buildExerciseCard(workout, session, ex) {
    const card = document.createElement('div');
    card.className = 'card exercise-card';

    const header = document.createElement('div');
    header.className = 'exercise-card-header';

    const nameEl = document.createElement('span');
    nameEl.className = 'exercise-name';
    nameEl.textContent = ex.name;

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'icon-btn';
    delBtn.textContent = '🗑';
    delBtn.setAttribute('aria-label', '종목 삭제');
    delBtn.addEventListener('click', function() {
      FitLog.ui.confirm('"' + ex.name + '" 종목을 삭제할까요?', function() {
        removeExercise(workout, session.id, ex.name);
      });
    });

    header.appendChild(nameEl);
    header.appendChild(delBtn);
    card.appendChild(header);

    const prev = findPreviousBest(ex.name, session.date);
    if (prev) {
      const prevEl = document.createElement('div');
      prevEl.className = 'exercise-prev';
      prevEl.textContent = '지난번: ' + prev.weight + 'kg × ' + prev.reps;
      card.appendChild(prevEl);
    }

    const setList = document.createElement('div');
    setList.className = 'set-list';
    ex.sets.forEach(function(set, idx) {
      setList.appendChild(buildSetRow(workout, session, ex, idx));
    });
    card.appendChild(setList);

    card.appendChild(buildAddSetRow(workout, session, ex, prev));

    return card;
  }

  function formatSetLabel(set, idx) {
    let text = (idx + 1) + '세트 ' + set.weight + 'kg × ' + set.reps + '회';
    if (set.rpe !== null && set.rpe !== undefined && set.rpe !== '') {
      text += ' RPE ' + set.rpe;
    }
    return text;
  }

  function buildSetRow(workout, session, ex, idx) {
    const row = document.createElement('div');
    row.className = 'set-row';

    function renderDisplay() {
      row.innerHTML = '';
      row.classList.remove('set-row-editing');
      const set = ex.sets[idx];

      const label = document.createElement('span');
      label.className = 'set-label';
      label.textContent = formatSetLabel(set, idx);

      const actions = document.createElement('div');
      actions.className = 'set-row-actions';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'icon-btn';
      editBtn.textContent = '✏️';
      editBtn.setAttribute('aria-label', '세트 수정');
      editBtn.addEventListener('click', renderEdit);

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'icon-btn';
      delBtn.textContent = '🗑';
      delBtn.setAttribute('aria-label', '세트 삭제');
      delBtn.addEventListener('click', function() {
        removeSet(workout, session.id, ex.name, idx);
      });

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);
      row.appendChild(label);
      row.appendChild(actions);
    }

    function renderEdit() {
      row.innerHTML = '';
      row.classList.add('set-row-editing');
      const set = ex.sets[idx];

      const weightInput = document.createElement('input');
      weightInput.type = 'number';
      weightInput.className = 'set-input set-input-weight';
      weightInput.value = set.weight;
      weightInput.step = '0.5';
      weightInput.setAttribute('aria-label', '무게(kg)');

      const repsInput = document.createElement('input');
      repsInput.type = 'number';
      repsInput.className = 'set-input set-input-reps';
      repsInput.value = set.reps;
      repsInput.step = '1';
      repsInput.setAttribute('aria-label', '횟수');

      const rpeInput = document.createElement('input');
      rpeInput.type = 'number';
      rpeInput.className = 'set-input set-input-rpe';
      rpeInput.value = (set.rpe === null || set.rpe === undefined) ? '' : set.rpe;
      rpeInput.step = '0.5';
      rpeInput.placeholder = 'RPE';
      rpeInput.setAttribute('aria-label', 'RPE');

      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'btn btn-primary';
      saveBtn.textContent = '저장';
      saveBtn.addEventListener('click', function() {
        const result = validateSetInputs(weightInput.value, repsInput.value, rpeInput.value);
        if (!result.ok) {
          FitLog.ui.toast(result.message);
          return;
        }
        updateSet(workout, session.id, ex.name, idx, result.value);
      });

      row.appendChild(weightInput);
      row.appendChild(repsInput);
      row.appendChild(rpeInput);
      row.appendChild(saveBtn);
    }

    renderDisplay();
    return row;
  }

  function getPrefillValues(ex, prev) {
    if (ex.sets.length > 0) {
      const last = ex.sets[ex.sets.length - 1];
      return {
        weight: last.weight,
        reps: last.reps,
        rpe: (last.rpe === null || last.rpe === undefined) ? '' : last.rpe
      };
    }
    if (prev) {
      return {
        weight: prev.weight,
        reps: prev.reps,
        rpe: (prev.rpe === null || prev.rpe === undefined) ? '' : prev.rpe
      };
    }
    return { weight: '', reps: '', rpe: '' };
  }

  function buildAddSetRow(workout, session, ex, prev) {
    const row = document.createElement('div');
    row.className = 'set-row set-add-row';

    const fill = getPrefillValues(ex, prev);

    const weightInput = document.createElement('input');
    weightInput.type = 'number';
    weightInput.className = 'set-input set-input-weight';
    weightInput.placeholder = 'kg';
    weightInput.step = '0.5';
    weightInput.value = fill.weight;
    weightInput.setAttribute('aria-label', '무게(kg)');

    const repsInput = document.createElement('input');
    repsInput.type = 'number';
    repsInput.className = 'set-input set-input-reps';
    repsInput.placeholder = '횟수';
    repsInput.step = '1';
    repsInput.value = fill.reps;
    repsInput.setAttribute('aria-label', '횟수');

    const rpeInput = document.createElement('input');
    rpeInput.type = 'number';
    rpeInput.className = 'set-input set-input-rpe';
    rpeInput.placeholder = 'RPE';
    rpeInput.step = '0.5';
    rpeInput.value = fill.rpe;
    rpeInput.setAttribute('aria-label', 'RPE');

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn btn-primary';
    addBtn.textContent = '추가';
    addBtn.addEventListener('click', function() {
      const result = validateSetInputs(weightInput.value, repsInput.value, rpeInput.value);
      if (!result.ok) {
        FitLog.ui.toast(result.message);
        return;
      }
      addSet(workout, session.id, ex.name, result.value);
    });

    row.appendChild(weightInput);
    row.appendChild(repsInput);
    row.appendChild(rpeInput);
    row.appendChild(addBtn);
    return row;
  }

  // 무게 > 0, 횟수(정수) >= 1, RPE는 빈 값 또는 1~10
  function validateSetInputs(weightStr, repsStr, rpeStr) {
    const weight = parseFloat(weightStr);
    if (!isFinite(weight) || !(weight > 0)) {
      return { ok: false, message: '무게는 0보다 커야 합니다' };
    }

    const reps = Number(repsStr);
    if (!Number.isInteger(reps) || reps < 1) {
      return { ok: false, message: '횟수는 1 이상의 정수여야 합니다' };
    }

    let rpe = null;
    const rpeTrim = (rpeStr === undefined || rpeStr === null) ? '' : String(rpeStr).trim();
    if (rpeTrim !== '') {
      rpe = Number(rpeTrim);
      if (isNaN(rpe) || rpe < 1 || rpe > 10) {
        return { ok: false, message: 'RPE는 1~10 사이여야 합니다' };
      }
    }

    return { ok: true, value: { weight: weight, reps: reps, rpe: rpe } };
  }

  // ---------- 저장 헬퍼 (모두 즉시 saveSessions + render) ----------

  function addSet(workout, sessionId, exName, setValue) {
    const sessions = FitLog.storage.getSessions();
    const session = sessions.find(function(s) { return s.id === sessionId; });
    if (!session) return;
    const ex = session.exercises.find(function(e) { return e.name === exName; });
    if (!ex) return;
    ex.sets.push(setValue);
    FitLog.storage.saveSessions(sessions);
    workout.render();
  }

  function updateSet(workout, sessionId, exName, idx, setValue) {
    const sessions = FitLog.storage.getSessions();
    const session = sessions.find(function(s) { return s.id === sessionId; });
    if (!session) return;
    const ex = session.exercises.find(function(e) { return e.name === exName; });
    if (!ex || !ex.sets[idx]) return;
    ex.sets[idx] = setValue;
    FitLog.storage.saveSessions(sessions);
    workout.render();
  }

  function removeSet(workout, sessionId, exName, idx) {
    const sessions = FitLog.storage.getSessions();
    const session = sessions.find(function(s) { return s.id === sessionId; });
    if (!session) return;
    const ex = session.exercises.find(function(e) { return e.name === exName; });
    if (!ex) return;
    ex.sets.splice(idx, 1);
    FitLog.storage.saveSessions(sessions);
    workout.render();
  }

  // 마지막 종목 삭제로 exercises가 비면 세션 자체를 배열에서 제거(달력 색칠 해제 목적)
  function removeExercise(workout, sessionId, exName) {
    let sessions = FitLog.storage.getSessions();
    const session = sessions.find(function(s) { return s.id === sessionId; });
    if (!session) return;
    session.exercises = session.exercises.filter(function(e) { return e.name !== exName; });
    if (session.exercises.length === 0) {
      sessions = sessions.filter(function(s) { return s.id !== sessionId; });
    }
    FitLog.storage.saveSessions(sessions);
    workout.render();
  }

  function addExercisesByNames(workout, names) {
    let sessions = FitLog.storage.getSessions();
    let session = sessions.find(function(s) { return s.date === workout.selectedDate; });
    if (!session) {
      session = { id: FitLog.storage.uuid(), date: workout.selectedDate, routineName: null, exercises: [] };
      sessions.push(session);
    }
    names.forEach(function(name) {
      if (!session.exercises.some(function(e) { return e.name === name; })) {
        session.exercises.push({ name: name, sets: [] });
      }
    });
    FitLog.storage.saveSessions(sessions);
    workout.render();
  }
})();
