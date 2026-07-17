# 종목 기록 방식(weight/time/cardio) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 종목마다 기록 방식(근력 kg×횟수 / 시간 초 / 유산소 km·분:초·kcal)을 지정하고, 매달리기·유산소 3종목을 자동 반영한다.

**Architecture:** 종목 DB(`fitlog_exerciseDB`)의 종목에 `type` 필드를 추가하고, 세션에 종목을 넣을 때 type을 스냅샷으로 저장한다. 운동 탭은 type별로 입력 칸·표시·검증을 분기하고, 통계 탭은 근력 세트만 집계한다. 스펙: `docs/superpowers/specs/2026-07-17-exercise-types-design.md`

**Tech Stack:** 순수 JS(ES 모듈 금지, IIFE + `window.FitLog` 네임스페이스), localStorage, 수동 DOM 렌더링.

## Global Constraints

- 외부 라이브러리/CDN/폰트 금지. `file://`로 완전 동작해야 함.
- localStorage 키는 기존 4개만 사용(`fitlog_sessions`, `fitlog_bodyMetrics`, `fitlog_routines`, `fitlog_exerciseDB`). 새 키 추가 금지.
- UI 문구 전부 한국어. 터치 영역 최소 44px.
- 테스트 프레임워크 없음. 각 태스크 검증은 `node --check js/*.js` + 브라우저 수동 확인.
- 날짜 문자열은 `FitLog.storage.todayStr()` 사용(`toISOString()` 금지).
- 커밋 메시지는 한국어, 끝에 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- type 값: `'weight' | 'time' | 'cardio'`. **type 필드가 없으면 어디서든 `'weight'`로 간주**(기존 데이터 호환).
- 세트 객체 형태: weight `{ weight, reps, rpe }` / time `{ durationSec }` / cardio `{ km, durationSec, kcal }`(cardio는 세 키를 항상 모두 저장, 빈 항목은 `null`).

---

### Task 1: 데이터 기반 — PRESET 유산소 부위, 시드 type, 마이그레이션, type 조회

**Files:**
- Modify: `js/data.js` (전체 교체 — 작은 파일)
- Modify: `js/storage.js` (`seedIfEmpty` 수정, `migrateExerciseTypes`·`getExerciseType` 추가)
- Modify: `js/app.js` (마이그레이션 호출 1줄)

**Interfaces:**
- Produces: `FitLog.storage.getExerciseType(name)` → `'weight'|'time'|'cardio'` (DB에 없는 이름이면 `'weight'`). Task 3이 사용.
- Produces: `FitLog.storage.migrateExerciseTypes()` → 반환값 없음. `app.js`의 `seedIfEmpty()` 직후 호출.
- Produces: `FitLog.data.PRESET`의 exercises 항목이 문자열에서 `{ name, type }` 객체로 변경됨.

- [ ] **Step 1: `js/data.js` 전체 교체 — exercises를 `{name, type}` 객체로 통일하고 유산소 부위 추가**

```js
FitLog.data = {
  // exercises 항목: { name, type } — type: 'weight' | 'time' | 'cardio'
  PRESET: [
    { name: '가슴', exercises: [
      { name: '벤치프레스', type: 'weight' },
      { name: '인클라인 덤벨프레스', type: 'weight' },
      { name: '딥스', type: 'weight' },
      { name: '케이블 크로스오버', type: 'weight' },
      { name: '체스트 프레스 머신', type: 'weight' }
    ] },
    { name: '등', exercises: [
      { name: '데드리프트', type: 'weight' },
      { name: '랫풀다운', type: 'weight' },
      { name: '바벨 로우', type: 'weight' },
      { name: '시티드 로우', type: 'weight' },
      { name: '풀업', type: 'weight' }
    ] },
    { name: '어깨', exercises: [
      { name: '오버헤드 프레스', type: 'weight' },
      { name: '덤벨 숄더프레스', type: 'weight' },
      { name: '사이드 레터럴 레이즈', type: 'weight' },
      { name: '페이스 풀', type: 'weight' }
    ] },
    { name: '팔', exercises: [
      { name: '바벨 컬', type: 'weight' },
      { name: '덤벨 컬', type: 'weight' },
      { name: '해머 컬', type: 'weight' },
      { name: '트라이셉스 익스텐션', type: 'weight' },
      { name: '케이블 푸시다운', type: 'weight' }
    ] },
    { name: '하체', exercises: [
      { name: '스쿼트', type: 'weight' },
      { name: '레그 프레스', type: 'weight' },
      { name: '레그 익스텐션', type: 'weight' },
      { name: '레그 컬', type: 'weight' },
      { name: '런지', type: 'weight' },
      { name: '카프 레이즈', type: 'weight' }
    ] },
    { name: '복근', exercises: [
      { name: '크런치', type: 'weight' },
      { name: '레그 레이즈', type: 'weight' },
      { name: '플랭크', type: 'weight' },
      { name: '케이블 크런치', type: 'weight' }
    ] },
    { name: '유산소', exercises: [
      { name: '런닝', type: 'cardio' },
      { name: '천국의 계단', type: 'cardio' },
      { name: '사이클', type: 'cardio' }
    ] }
  ],

  // 마이그레이션에서 기존 사용자 DB에 보장할 유산소 종목 이름
  CARDIO_NAMES: ['런닝', '천국의 계단', '사이클']
};
```

- [ ] **Step 2: `js/storage.js`의 `seedIfEmpty`에서 type을 저장하도록 수정**

기존 `seedIfEmpty`의 `exercises` 매핑을 다음으로 교체:

```js
  seedIfEmpty() {
    if (localStorage.getItem('fitlog_exerciseDB') !== null) {
      return;
    }
    const db = {
      bodyParts: FitLog.data.PRESET.map(preset => ({
        id: this.uuid(),
        name: preset.name,
        exercises: preset.exercises.map(ex => ({
          id: this.uuid(),
          name: ex.name,
          type: ex.type
        }))
      }))
    };
    this.saveExerciseDB(db);
  },
```

- [ ] **Step 3: `js/storage.js`에 `migrateExerciseTypes`와 `getExerciseType` 추가**

`seedIfEmpty` 바로 아래에 추가:

```js
  // 기존 사용자 DB에 유산소 부위·종목을 보장하고 매달리기를 시간 타입으로 전환한다.
  // 멱등: 이미 반영된 상태에서 다시 실행해도 변경 없음(변경이 있을 때만 저장).
  migrateExerciseTypes() {
    const db = this.getExerciseDB();
    let changed = false;

    let cardioPart = db.bodyParts.find(function(p) { return p.name === '유산소'; });
    if (!cardioPart) {
      cardioPart = { id: this.uuid(), name: '유산소', exercises: [] };
      db.bodyParts.push(cardioPart);
      changed = true;
    }
    FitLog.data.CARDIO_NAMES.forEach(function(name) {
      if (!cardioPart.exercises.some(function(e) { return e.name === name; })) {
        cardioPart.exercises.push({ id: FitLog.storage.uuid(), name: name, type: 'cardio' });
        changed = true;
      }
    });

    db.bodyParts.forEach(function(part) {
      part.exercises.forEach(function(ex) {
        if (ex.name === '매달리기' && ex.type !== 'time') {
          ex.type = 'time';
          changed = true;
        }
      });
    });

    if (changed) {
      this.saveExerciseDB(db);
    }
  },

  // 종목 이름으로 기록 방식 조회. DB에 없거나 type이 없으면 'weight'.
  getExerciseType(name) {
    const db = this.getExerciseDB();
    for (let i = 0; i < db.bodyParts.length; i++) {
      const exercises = db.bodyParts[i].exercises;
      for (let j = 0; j < exercises.length; j++) {
        if (exercises[j].name === name) {
          return exercises[j].type || 'weight';
        }
      }
    }
    return 'weight';
  },
```

- [ ] **Step 4: `js/app.js`에서 시드 직후 마이그레이션 호출**

```js
  FitLog.storage.seedIfEmpty();
  FitLog.storage.migrateExerciseTypes();
```

- [ ] **Step 5: 문법 검증**

Run: `node --check js/data.js; node --check js/storage.js; node --check js/app.js`
Expected: 출력 없음(에러 없음)

- [ ] **Step 6: 브라우저 확인**

`index.html`을 브라우저로 열고 개발자 콘솔에서:

```js
JSON.parse(localStorage.getItem('fitlog_exerciseDB')).bodyParts.map(p => p.name)
```

Expected: 배열에 `'유산소'` 포함. 유산소 부위의 exercises에 런닝/천국의 계단/사이클이 `type: 'cardio'`로 존재. 새로고침을 반복해도 중복 추가되지 않음. (매달리기가 DB에 있는 환경이면 `type: 'time'`으로 바뀌었는지도 확인.)

- [ ] **Step 7: 커밋**

```bash
git add js/data.js js/storage.js js/app.js
git commit -m "feat: 종목 type 필드 도입 - 유산소 부위 시드·마이그레이션 및 type 조회"
```

---

### Task 2: 종목 추가/수정 모달에 기록 방식 선택 추가

**Files:**
- Modify: `js/exercises.js` (`openNameModal` 옆에 `openExerciseModal` 추가, `addExercise`/`editExercise` 수정)
- Modify: `css/style.css` (`.modal-type-select` 여백 1규칙)

**Interfaces:**
- Consumes: 없음 (Task 1과 독립 — type 필드 규약만 공유)
- Produces: 종목 DB에 새로 추가/수정되는 종목이 `type` 필드를 갖게 됨.

- [ ] **Step 1: `js/exercises.js`에 종목 전용 모달 헬퍼 추가**

`openNameModal` 함수 바로 아래에 추가 (부위 추가/수정은 계속 `openNameModal` 사용):

```js
  // 종목 추가/수정용: 이름 + 기록 방식 선택. onSave(name, type)이 false를 반환하면 닫히지 않는다.
  function openExerciseModal(title, initialName, initialType, onSave) {
    FitLog.ui.modal({
      title: title,
      bodyHTML:
        '<input type="text" class="modal-input" autocomplete="off">' +
        '<select class="modal-input modal-type-select" aria-label="기록 방식">' +
        '<option value="weight">근력 (kg × 횟수)</option>' +
        '<option value="time">시간 (초)</option>' +
        '<option value="cardio">유산소 (km · 시간 · kcal)</option>' +
        '</select>',
      onConfirm: function() {
        const input = document.querySelector('#modal-root .modal-input[type="text"]');
        const select = document.querySelector('#modal-root .modal-type-select');
        const name = input ? input.value.trim() : '';
        const type = select ? select.value : 'weight';
        return onSave(name, type);
      }
    });

    const input = document.querySelector('#modal-root .modal-input[type="text"]');
    const select = document.querySelector('#modal-root .modal-type-select');
    if (input) {
      if (initialName) {
        input.value = initialName;
      }
      input.focus();
      input.select();
    }
    if (select) {
      select.value = initialType || 'weight';
    }
  }
```

- [ ] **Step 2: `addExercise`를 `openExerciseModal` 사용으로 교체**

```js
      function addExercise(part) {
        openExerciseModal('종목 추가', '', 'weight', function(value, type) {
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
          target.exercises.push({ id: FitLog.storage.uuid(), name: value, type: type });
          const ok = FitLog.storage.saveExerciseDB(db);
          render();
          if (ok) FitLog.ui.toast('종목을 추가했습니다');
          return true;
        });
      }
```

- [ ] **Step 3: `editExercise`를 `openExerciseModal` 사용으로 교체 (이름+type 함께 수정)**

```js
      function editExercise(part, ex) {
        openExerciseModal('종목 수정', ex.name, ex.type || 'weight', function(value, type) {
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
          exTarget.type = type;
          const ok = FitLog.storage.saveExerciseDB(db);
          render();
          if (ok) FitLog.ui.toast('종목을 수정했습니다');
          return true;
        });
      }
```

주의: 모달 제목이 '종목 이름 수정' → '종목 수정', 토스트가 '종목 이름을 수정했습니다' → '종목을 수정했습니다'로 바뀐다(이름 외 기록 방식도 수정하므로).

- [ ] **Step 4: `css/style.css`의 `.modal-input:focus` 규칙 아래에 select 여백 추가**

```css
.modal-type-select {
  margin-top: 8px;
}
```

- [ ] **Step 5: 문법 검증**

Run: `node --check js/exercises.js`
Expected: 출력 없음

- [ ] **Step 6: 브라우저 확인**

기록 탭 → `+ 종목 추가` → 부위 선택 → `+ 종목 추가`: 이름 입력칸 아래 기록 방식 select(기본 '근력')가 보이고, '시간 (초)'로 저장한 종목이 콘솔의 exerciseDB에서 `type: 'time'`으로 저장되는지 확인. ✏️ 수정 시 기존 type이 선택된 채 열리는지 확인.

- [ ] **Step 7: 커밋**

```bash
git add js/exercises.js css/style.css
git commit -m "feat: 종목 추가/수정 모달에 기록 방식 선택 추가"
```

---

### Task 3: 운동 탭 — type별 세트 입력·표시·검증·지난번·프리필

**Files:**
- Modify: `js/workout.js` (`findPreviousBest`, `buildExerciseCard`, `formatSetLabel`, `buildSetRow`, `getPrefillValues`, `buildAddSetRow`, `addExercisesByNames` 수정 + 헬퍼 추가)
- Modify: `css/style.css` (cardio 입력칸 패딩 1규칙)

**Interfaces:**
- Consumes: `FitLog.storage.getExerciseType(name)` (Task 1)
- Produces: 세션 종목 객체가 `{ name, type, sets }` 형태로 저장됨(기존 데이터는 type 없음 = weight). 세트 객체는 Global Constraints의 type별 형태.

- [ ] **Step 1: `addExercisesByNames`에서 type 스냅샷 저장**

`js/workout.js` 맨 아래 `addExercisesByNames` 함수에서 종목 push 부분을 교체:

```js
    names.forEach(function(name) {
      if (!session.exercises.some(function(e) { return e.name === name; })) {
        session.exercises.push({
          name: name,
          type: FitLog.storage.getExerciseType(name),
          sets: []
        });
      }
    });
```

- [ ] **Step 2: 표시 헬퍼 추가 — `formatDuration`, `formatSetLabel` 교체, `formatPrevLabel` 추가**

`formatSetLabel` 함수를 다음 헬퍼 묶음(`formatDuration`/`isCardioSet`/`cardioParts`/`formatSetLabel`/`formatPrevLabel`)으로 교체한다. **세트 표시는 세트 객체의 필드 기준으로 분기**한다(type을 바꿔도 과거 세트는 기록 당시 형식으로 보이도록):

```js
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

  // 세트 형태(필드) 기준으로 포맷: cardio > time > weight 순으로 판별
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
```

- [ ] **Step 3: `findPreviousBest`를 type 인자를 받도록 교체**

반환값이 세트 객체에서 `{ set }` 래퍼로 바뀐다. 같은 이름 종목이 있는 직전 세션에서, type에 맞는 세트가 없으면 `null`(더 과거로 거슬러 올라가지 않음 — 현행과 동일한 "가장 최근 세션" 기준 유지):

```js
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
```

- [ ] **Step 4: `buildExerciseCard`에서 type을 구해 하위로 전달**

`buildExerciseCard` 안에서 `findPreviousBest` 호출부와 그 아래를 다음으로 교체:

```js
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
```

- [ ] **Step 5: type별 입력 에디터 헬퍼 추가**

`buildSetRow` 위에 추가:

```js
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
```

- [ ] **Step 6: 검증 함수 추가 — `validateTimeInput`, `validateCardioInputs`**

기존 `validateSetInputs` 아래에 추가:

```js
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
```

- [ ] **Step 7: `getPrefillValues`를 type 기반으로 교체**

```js
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
```

- [ ] **Step 8: `buildSetRow`의 `renderEdit`를 에디터 사용으로 교체 (시그니처에 type 추가)**

```js
  function buildSetRow(workout, session, ex, idx, type) {
```

`renderEdit`를 다음으로 교체 (`renderDisplay`는 그대로):

```js
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
```

주의: 과거 세트의 형태와 카드의 현재 type이 다르면(예: 예전 kg×횟수로 적은 매달리기 세트를 시간 타입 카드에서 수정) 편집 칸은 현재 type 기준으로 열리고 저장 시 현재 type 형태로 바뀐다. 이는 의도된 동작(수정은 곧 새 형식으로 재입력).

- [ ] **Step 9: `buildAddSetRow`를 에디터 사용으로 교체 (시그니처에 type 추가)**

```js
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
```

- [ ] **Step 10: `css/style.css`의 `.set-add-row .set-input` 규칙 아래에 cardio 입력칸 패딩 추가**

한 줄에 4칸+버튼이 들어가므로 좌우 패딩을 줄인다:

```css
.set-input-cardio {
  padding: 6px 4px;
}
```

- [ ] **Step 11: 문법 검증**

Run: `node --check js/workout.js`
Expected: 출력 없음

- [ ] **Step 12: 브라우저 확인**

1. 기록 탭 → 종목 추가 → 유산소 → 런닝: km/분/초/kcal 4칸 + 추가 버튼 표시.
2. `5 / 30 / 30 / 320` 입력 → "1세트 5km · 30:30 · 320kcal" 표시. km만 입력해도 저장됨. 전부 비우고 추가 → "km·시간·칼로리 중 하나 이상 입력해주세요" 토스트.
3. 매달리기(또는 시간 타입 아무 종목): 초 1칸, `45` → "1세트 45초". `0` 또는 소수 → 오류 토스트.
4. 세트 ✏️ 수정: type에 맞는 칸으로 열리고 수정·저장 정상.
5. 다음 날짜(달력에서 내일 선택)에 같은 종목 추가 → "지난번: …" 표시가 type 형식에 맞음, 프리필 정상.
6. 기존 근력 종목(벤치프레스 등)은 이전과 완전히 동일하게 동작.

- [ ] **Step 13: 커밋**

```bash
git add js/workout.js css/style.css
git commit -m "feat: 운동 탭 type별 세트 기록 - 시간(초)·유산소(km/분:초/kcal) 입력 지원"
```

---

### Task 4: 통계 탭 — 근력 세트만 집계

**Files:**
- Modify: `js/stats.js` (`getAllExerciseNames`, `computeOneRMSeries`, `sessionVolume`)

**Interfaces:**
- Consumes: 세션 종목의 `type` 스냅샷(없으면 weight), 세트의 `weight` 필드 유무.
- Produces: 없음 (내부 렌더링만).

- [ ] **Step 1: `getAllExerciseNames`에서 근력 종목만 수집**

```js
  function getAllExerciseNames(sessions) {
    const seen = Object.create(null);
    const names = [];
    sessions.forEach(function(s) {
      (s.exercises || []).forEach(function(ex) {
        const type = ex.type || 'weight';
        if (type !== 'weight') return;
        if (!seen[ex.name]) {
          seen[ex.name] = true;
          names.push(ex.name);
        }
      });
    });
    names.sort(function(a, b) { return a.localeCompare(b, 'ko'); });
    return names;
  }
```

- [ ] **Step 2: `computeOneRMSeries`에서 weight 없는 세트 건너뛰기**

세트 순회 시작 부분에 가드 추가:

```js
      ex.sets.forEach(function(set) {
        if (set.weight === undefined) return;
        const weight = Number(set.weight) || 0;
        const reps = Number(set.reps) || 0;
        const oneRM = weight * (1 + reps / 30);
        if (maxOneRM === null || oneRM > maxOneRM) {
          maxOneRM = oneRM;
        }
      });
```

- [ ] **Step 3: `sessionVolume`에서 weight 없는 세트 제외**

```js
  function sessionVolume(session) {
    let total = 0;
    (session.exercises || []).forEach(function(ex) {
      (ex.sets || []).forEach(function(set) {
        if (set.weight === undefined || set.reps === undefined) return;
        const weight = Number(set.weight) || 0;
        const reps = Number(set.reps) || 0;
        total += weight * reps;
      });
    });
    return total;
  }
```

- [ ] **Step 4: 문법 검증**

Run: `node --check js/stats.js`
Expected: 출력 없음

- [ ] **Step 5: 브라우저 확인**

유산소·시간 종목 기록이 있는 상태에서 통계 탭: 1RM 종목 select에 런닝/매달리기(시간 타입으로 기록한 것)가 나오지 않고, 볼륨 그래프 수치가 근력 세트만 반영. 근력 종목 1RM 추이는 이전과 동일.

- [ ] **Step 6: 커밋**

```bash
git add js/stats.js
git commit -m "feat: 통계 탭에서 시간·유산소 기록 제외 - 1RM 목록·볼륨은 근력 세트만 집계"
```

---

### Task 5: 통합 QA

**Files:**
- Modify: 발견된 문제에 한해 해당 파일 수정.

**Interfaces:** 없음 (검증 전용).

- [ ] **Step 1: 전체 문법 검증**

Run: `node --check js/ui.js; node --check js/data.js; node --check js/storage.js; node --check js/exercises.js; node --check js/workout.js; node --check js/routines.js; node --check js/stats.js; node --check js/charts.js; node --check js/body.js; node --check js/app.js`
Expected: 전부 출력 없음

- [ ] **Step 2: 스펙의 검증 시나리오 전체 수행 (브라우저)**

스펙 `docs/superpowers/specs/2026-07-17-exercise-types-design.md`의 "검증 방법" 7항목:

1. 기존 데이터 상태에서 열어 유산소 부위·3종목 자동 생성, 매달리기 time 전환.
2. 매달리기: 초만 입력·표시·수정·삭제.
3. 런닝: km/분/초/kcal 입력(일부만 입력 포함)·표시·수정·삭제.
4. 근력 종목 현행 동일 동작 (프리필·지난번·RPE 포함).
5. 통계 탭 1RM 목록·볼륨 정상.
6. 루틴에 유산소 종목 포함 → 기록 탭 적용 시 cardio 입력 칸 표시 (루틴 적용 경로도 `addExercisesByNames`를 타므로 type 스냅샷이 저장되어야 함).
7. 설정의 JSON export → localStorage 비우고 import → 데이터·입력 칸 형식 동일.

- [ ] **Step 3: 발견된 문제 수정 후 커밋**

문제가 없으면 커밋 생략. 있으면:

```bash
git add <수정 파일>
git commit -m "fix: 종목 기록 방식 QA 반영 - <내용>"
```
