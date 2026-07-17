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

    // routineName(선택): 지정하면 세션의 routineName을 함께 설정한다(루틴 적용 시 사용).
    addExercisesByNames: function(names, routineName) {
      return addExercisesByNames(this, names, routineName);
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

    const routineBtn = document.createElement('button');
    routineBtn.type = 'button';
    routineBtn.className = 'btn session-routine-btn';
    routineBtn.textContent = '루틴 불러오기';
    routineBtn.addEventListener('click', function() {
      if (FitLog.routines) FitLog.routines.openApplyPicker();
    });
    area.appendChild(routineBtn);

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn btn-primary session-add-exercise-btn';
    addBtn.textContent = '+ 종목 추가';
    addBtn.addEventListener('click', function() {
      FitLog.exercises.openPicker(function(name) {
        // 이미 오늘 세션에 있는 종목을 다시 선택한 경우 addExercisesByNames는 아무것도
        // 추가하지 않는다(중복 방지). 이때도 "추가했습니다"라고 토스트를 띄우면 실제
        // 결과와 다른 안내가 되므로, 추가 전 상태를 미리 확인해 메시지를 구분한다.
        const alreadyExists = !!(session && session.exercises.some(function(e) { return e.name === name; }));
        const ok = addExercisesByNames(workout, [name]);
        if (alreadyExists) {
          FitLog.ui.toast('이미 추가된 종목입니다');
        } else if (ok) {
          FitLog.ui.toast('종목을 추가했습니다');
        }
      });
    });
    area.appendChild(addBtn);
  }

  // 같은 이름 종목이 있는 세션 중 date < beforeDate인 가장 최근 세션에서
  // type에 맞는 대표 세트를 찾는다. weight: 최고 무게, time: 최장 시간, cardio: 마지막 세트.
  function findPreviousBest(name, beforeDate, type) {
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

    if (type === 'cardio') {
      const last = ex.sets[ex.sets.length - 1];
      return isCardioSet(last) ? { set: last } : null;
    }
    if (type === 'time') {
      let best = null;
      ex.sets.forEach(function(st) {
        if (st.durationSec === undefined || st.durationSec === null || isCardioSet(st)) return;
        if (best === null || st.durationSec > best.durationSec) best = st;
      });
      return best ? { set: best } : null;
    }
    let best = null;
    ex.sets.forEach(function(st) {
      if (st.weight === undefined) return;
      if (best === null || st.weight > best.weight) best = st;
    });
    return best ? { set: best } : null;
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
        if (removeExercise(workout, session.id, ex.name)) {
          FitLog.ui.toast('종목을 삭제했습니다');
        }
      });
    });

    header.appendChild(nameEl);
    header.appendChild(delBtn);
    card.appendChild(header);

    const type = ex.type || 'weight';
    const prev = findPreviousBest(ex.name, session.date, type);
    if (prev) {
      const prevEl = document.createElement('div');
      prevEl.className = 'exercise-prev';
      prevEl.textContent = formatPrevLabel(type, prev.set);
      card.appendChild(prevEl);
    }

    const setList = document.createElement('div');
    setList.className = 'set-list';
    ex.sets.forEach(function(set, idx) {
      setList.appendChild(buildSetRow(workout, session, ex, idx, type));
    });
    card.appendChild(setList);

    card.appendChild(buildAddSetRow(workout, session, ex, prev, type));

    return card;
  }

  // 초 → 'm:ss' (유산소 표시용). 예: 1830 → '30:30', 45 → '0:45'
  function formatDuration(sec) {
    return Math.floor(sec / 60) + ':' + pad2(sec % 60);
  }

  function isCardioSet(set) {
    return 'km' in set || 'kcal' in set;
  }

  function cardioParts(set) {
    const parts = [];
    if (set.km !== null && set.km !== undefined) parts.push(set.km + 'km');
    if (set.durationSec !== null && set.durationSec !== undefined) parts.push(formatDuration(set.durationSec));
    if (set.kcal !== null && set.kcal !== undefined) parts.push(set.kcal + 'kcal');
    return parts.join(' · ');
  }

  // 세트 형태(필드) 기준으로 포맷: cardio > time > weight 순으로 판별.
  // 종목의 type을 나중에 바꿔도 과거 세트는 기록 당시 형식대로 표시된다.
  function formatSetLabel(set, idx) {
    const prefix = (idx + 1) + '세트 ';
    if (isCardioSet(set)) {
      return prefix + cardioParts(set);
    }
    if ('durationSec' in set) {
      return prefix + set.durationSec + '초';
    }
    let text = prefix + set.weight + 'kg × ' + set.reps + '회';
    if (set.rpe !== null && set.rpe !== undefined && set.rpe !== '') {
      text += ' RPE ' + set.rpe;
    }
    return text;
  }

  function formatPrevLabel(type, set) {
    if (type === 'time') return '지난번: ' + set.durationSec + '초';
    if (type === 'cardio') return '지난번: ' + cardioParts(set);
    return '지난번: ' + set.weight + 'kg × ' + set.reps;
  }

  function numberInput(className, placeholder, step, value, ariaLabel) {
    const input = document.createElement('input');
    input.type = 'number';
    input.className = className;
    input.placeholder = placeholder;
    input.step = step;
    input.value = (value === null || value === undefined) ? '' : value;
    input.setAttribute('aria-label', ariaLabel);
    return input;
  }

  // type별 입력 칸 묶음. read()는 { ok, value } 또는 { ok: false, message }를 반환.
  function createSetEditor(type, fill) {
    if (type === 'time') {
      const secInput = numberInput('set-input set-input-sec', '초', '1', fill.durationSec, '시간(초)');
      return {
        inputs: [secInput],
        read: function() { return validateTimeInput(secInput.value); }
      };
    }
    if (type === 'cardio') {
      const kmInput = numberInput('set-input set-input-cardio', 'km', '0.1', fill.km, '거리(km)');
      const minInput = numberInput('set-input set-input-cardio', '분', '1', fill.min, '분');
      const secInput = numberInput('set-input set-input-cardio', '초', '1', fill.sec, '초');
      const kcalInput = numberInput('set-input set-input-cardio', 'kcal', '1', fill.kcal, '칼로리');
      return {
        inputs: [kmInput, minInput, secInput, kcalInput],
        read: function() {
          return validateCardioInputs(kmInput.value, minInput.value, secInput.value, kcalInput.value);
        }
      };
    }
    const weightInput = numberInput('set-input set-input-weight', 'kg', '0.5', fill.weight, '무게(kg)');
    const repsInput = numberInput('set-input set-input-reps', '횟수', '1', fill.reps, '횟수');
    const rpeInput = numberInput('set-input set-input-rpe', 'RPE', '0.5', fill.rpe, 'RPE');
    return {
      inputs: [weightInput, repsInput, rpeInput],
      read: function() { return validateSetInputs(weightInput.value, repsInput.value, rpeInput.value); }
    };
  }

  function buildSetRow(workout, session, ex, idx, type) {
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
        if (removeSet(workout, session.id, ex.name, idx)) {
          FitLog.ui.toast('세트를 삭제했습니다');
        }
      });

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);
      row.appendChild(label);
      row.appendChild(actions);
    }

    // 과거 세트 형태와 카드의 현재 type이 달라도 편집 칸은 현재 type 기준으로 열리고
    // 저장 시 현재 type 형태로 바뀐다(수정은 곧 새 형식으로 재입력).
    function renderEdit() {
      row.innerHTML = '';
      row.classList.add('set-row-editing');
      const set = ex.sets[idx];

      const editor = createSetEditor(type, setToFill(type, set));

      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'btn btn-primary';
      saveBtn.textContent = '저장';
      saveBtn.addEventListener('click', function() {
        const result = editor.read();
        if (!result.ok) {
          FitLog.ui.toast(result.message);
          return;
        }
        if (updateSet(workout, session.id, ex.name, idx, result.value)) {
          FitLog.ui.toast('세트를 수정했습니다');
        }
      });

      editor.inputs.forEach(function(input) { row.appendChild(input); });
      row.appendChild(saveBtn);
    }

    renderDisplay();
    return row;
  }

  // 세트 객체 → type별 입력 프리필 값
  function setToFill(type, set) {
    if (type === 'time') {
      return { durationSec: 'durationSec' in set ? set.durationSec : '' };
    }
    if (type === 'cardio') {
      const hasDur = set.durationSec !== null && set.durationSec !== undefined;
      return {
        km: set.km,
        min: hasDur ? Math.floor(set.durationSec / 60) : '',
        sec: hasDur ? set.durationSec % 60 : '',
        kcal: set.kcal
      };
    }
    return {
      weight: set.weight,
      reps: set.reps,
      rpe: (set.rpe === null || set.rpe === undefined) ? '' : set.rpe
    };
  }

  function emptyFill(type) {
    if (type === 'time') return { durationSec: '' };
    if (type === 'cardio') return { km: '', min: '', sec: '', kcal: '' };
    return { weight: '', reps: '', rpe: '' };
  }

  function getPrefillValues(type, ex, prev) {
    if (ex.sets.length > 0) {
      return setToFill(type, ex.sets[ex.sets.length - 1]);
    }
    if (prev) {
      return setToFill(type, prev.set);
    }
    return emptyFill(type);
  }

  function buildAddSetRow(workout, session, ex, prev, type) {
    const row = document.createElement('div');
    row.className = 'set-row set-add-row';

    const editor = createSetEditor(type, getPrefillValues(type, ex, prev));

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn btn-primary';
    addBtn.textContent = '추가';
    addBtn.addEventListener('click', function() {
      const result = editor.read();
      if (!result.ok) {
        FitLog.ui.toast(result.message);
        return;
      }
      if (addSet(workout, session.id, ex.name, result.value)) {
        FitLog.ui.toast('세트를 추가했습니다');
      }
    });

    editor.inputs.forEach(function(input) { row.appendChild(input); });
    row.appendChild(addBtn);
    return row;
  }

  // 무게 > 0, 횟수(정수) >= 1, RPE는 빈 값 또는 1~10
  // weight/reps/rpe 모두 Number()로 통일한다(parseFloat은 "60kg" 같은 앞부분만 숫자인
  // 문자열도 60으로 통과시켜버려 reps의 Number() 기준과 결과가 달라질 수 있었다).
  function validateSetInputs(weightStr, repsStr, rpeStr) {
    const weight = Number(weightStr);
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

  // 초는 1 이상의 정수
  function validateTimeInput(secStr) {
    const sec = Number(secStr);
    if (!Number.isInteger(sec) || sec < 1) {
      return { ok: false, message: '초는 1 이상의 정수여야 합니다' };
    }
    return { ok: true, value: { durationSec: sec } };
  }

  // km·시간(분:초)·kcal 중 최소 한 항목 입력. 빈 항목은 null로 저장.
  function validateCardioInputs(kmStr, minStr, secStr, kcalStr) {
    const kmT = String(kmStr === undefined || kmStr === null ? '' : kmStr).trim();
    const minT = String(minStr === undefined || minStr === null ? '' : minStr).trim();
    const secT = String(secStr === undefined || secStr === null ? '' : secStr).trim();
    const kcalT = String(kcalStr === undefined || kcalStr === null ? '' : kcalStr).trim();

    let km = null;
    if (kmT !== '') {
      km = Number(kmT);
      if (!isFinite(km) || !(km > 0)) {
        return { ok: false, message: '거리는 0보다 커야 합니다' };
      }
    }

    let durationSec = null;
    if (minT !== '' || secT !== '') {
      const min = minT === '' ? 0 : Number(minT);
      const sec = secT === '' ? 0 : Number(secT);
      if (!Number.isInteger(min) || min < 0) {
        return { ok: false, message: '분은 0 이상의 정수여야 합니다' };
      }
      if (!Number.isInteger(sec) || sec < 0 || sec > 59) {
        return { ok: false, message: '초는 0~59 사이의 정수여야 합니다' };
      }
      durationSec = min * 60 + sec;
      if (durationSec === 0) durationSec = null;
    }

    let kcal = null;
    if (kcalT !== '') {
      kcal = Number(kcalT);
      if (!Number.isInteger(kcal) || kcal < 1) {
        return { ok: false, message: '칼로리는 1 이상의 정수여야 합니다' };
      }
    }

    if (km === null && durationSec === null && kcal === null) {
      return { ok: false, message: 'km·시간·칼로리 중 하나 이상 입력해주세요' };
    }
    return { ok: true, value: { km: km, durationSec: durationSec, kcal: kcal } };
  }

  // ---------- 저장 헬퍼 (모두 즉시 saveSessions + render) ----------

  // 저장 헬퍼는 모두 saveSessions()의 성공 여부(boolean)를 반환한다.
  // 호출부는 이 값으로 성공 토스트 표시 여부를 결정한다(실패 시 storage.save가
  // 이미 에러 토스트를 띄웠으므로 성공 토스트를 또 띄우면 안내가 겹치거나 틀린다).
  function addSet(workout, sessionId, exName, setValue) {
    const sessions = FitLog.storage.getSessions();
    const session = sessions.find(function(s) { return s.id === sessionId; });
    if (!session) return false;
    const ex = session.exercises.find(function(e) { return e.name === exName; });
    if (!ex) return false;
    ex.sets.push(setValue);
    const ok = FitLog.storage.saveSessions(sessions);
    workout.render();
    return ok;
  }

  function updateSet(workout, sessionId, exName, idx, setValue) {
    const sessions = FitLog.storage.getSessions();
    const session = sessions.find(function(s) { return s.id === sessionId; });
    if (!session) return false;
    const ex = session.exercises.find(function(e) { return e.name === exName; });
    if (!ex || !ex.sets[idx]) return false;
    ex.sets[idx] = setValue;
    const ok = FitLog.storage.saveSessions(sessions);
    workout.render();
    return ok;
  }

  function removeSet(workout, sessionId, exName, idx) {
    const sessions = FitLog.storage.getSessions();
    const session = sessions.find(function(s) { return s.id === sessionId; });
    if (!session) return false;
    const ex = session.exercises.find(function(e) { return e.name === exName; });
    if (!ex) return false;
    ex.sets.splice(idx, 1);
    const ok = FitLog.storage.saveSessions(sessions);
    workout.render();
    return ok;
  }

  // 마지막 종목 삭제로 exercises가 비면 세션 자체를 배열에서 제거(달력 색칠 해제 목적)
  function removeExercise(workout, sessionId, exName) {
    let sessions = FitLog.storage.getSessions();
    const session = sessions.find(function(s) { return s.id === sessionId; });
    if (!session) return false;
    session.exercises = session.exercises.filter(function(e) { return e.name !== exName; });
    if (session.exercises.length === 0) {
      sessions = sessions.filter(function(s) { return s.id !== sessionId; });
    }
    const ok = FitLog.storage.saveSessions(sessions);
    workout.render();
    return ok;
  }

  function addExercisesByNames(workout, names, routineName) {
    let sessions = FitLog.storage.getSessions();
    let session = sessions.find(function(s) { return s.date === workout.selectedDate; });
    if (!session) {
      session = { id: FitLog.storage.uuid(), date: workout.selectedDate, routineName: null, exercises: [] };
      sessions.push(session);
    }
    names.forEach(function(name) {
      if (!session.exercises.some(function(e) { return e.name === name; })) {
        session.exercises.push({
          name: name,
          type: FitLog.storage.getExerciseType(name),
          sets: []
        });
      }
    });
    if (routineName) {
      session.routineName = routineName;
    }
    const ok = FitLog.storage.saveSessions(sessions);
    workout.render();
    return ok;
  }
})();
