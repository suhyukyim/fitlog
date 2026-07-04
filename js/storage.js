FitLog.storage = {
  load(key) {
    try {
      const val = localStorage.getItem(key);
      return val === null ? null : JSON.parse(val);
    } catch (e) {
      return null;
    }
  },

  // localStorage.setItem은 저장 공간 초과(QuotaExceededError) 등으로 던질 수 있다.
  // 여기서 잡아 토스트로 안내하지 않으면 호출부의 이후 코드(주로 render())가 실행되지
  // 않아 화면이 먹통이 된 것처럼 보인다. 실패 시 false를 반환(호출부는 대부분 반환값을
  // 쓰지 않지만, 실패해도 예외가 위로 전파되지 않아 뒤따르는 render()는 정상 실행되고
  // 저장되지 않은 값은 다음 getSessions() 등에서 그대로 드러난다).
  save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      if (FitLog.ui && typeof FitLog.ui.toast === 'function') {
        FitLog.ui.toast('저장 공간이 부족하여 저장하지 못했습니다');
      }
      return false;
    }
  },

  getSessions() {
    return this.load('fitlog_sessions') || [];
  },

  saveSessions(arr) {
    return this.save('fitlog_sessions', arr);
  },

  getBodyMetrics() {
    return this.load('fitlog_bodyMetrics') || [];
  },

  saveBodyMetrics(arr) {
    return this.save('fitlog_bodyMetrics', arr);
  },

  getRoutines() {
    return this.load('fitlog_routines') || [];
  },

  saveRoutines(arr) {
    return this.save('fitlog_routines', arr);
  },

  getExerciseDB() {
    return this.load('fitlog_exerciseDB') || { bodyParts: [] };
  },

  saveExerciseDB(db) {
    return this.save('fitlog_exerciseDB', db);
  },

  uuid() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return Date.now() + '-' + Math.random().toString(36).slice(2);
  },

  todayStr(d) {
    const dt = d || new Date();
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  },

  seedIfEmpty() {
    if (localStorage.getItem('fitlog_exerciseDB') !== null) {
      return;
    }
    const db = {
      bodyParts: FitLog.data.PRESET.map(preset => ({
        id: this.uuid(),
        name: preset.name,
        exercises: preset.exercises.map(exName => ({
          id: this.uuid(),
          name: exName
        }))
      }))
    };
    this.saveExerciseDB(db);
  },

  // 4개 데이터 키를 하나의 JSON 문자열로 직렬화한다. exportedAt은 백업 시각(ISO
  // 문자열)이며, 앱 내 날짜(YYYY-MM-DD, todayStr())와는 별개의 타임스탬프이다.
  exportJSON() {
    return JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      sessions: this.getSessions(),
      bodyMetrics: this.getBodyMetrics(),
      routines: this.getRoutines(),
      exerciseDB: this.getExerciseDB()
    });
  },

  // 구조 검증을 모두 통과한 뒤에만 저장을 시작한다(중간에 실패하면 어떤
  // localStorage 키도 건드리지 않은 채 false를 반환). 저장 도중 하나라도
  // 실패하면(예: 저장 공간 초과) 이미 쓰여진 키들을 가져오기 전 상태로 되돌려
  // 신/구 데이터가 섞이지 않도록 한다(전부 성공 또는 전부 원상복구).
  importJSON(text) {
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return false;
    }

    if (!data || typeof data !== 'object') {
      return false;
    }

    const sessions = data.sessions;
    const bodyMetrics = data.bodyMetrics;
    const routines = data.routines;
    const exerciseDB = data.exerciseDB;

    if (!Array.isArray(sessions) || !Array.isArray(bodyMetrics) || !Array.isArray(routines)) {
      return false;
    }
    if (!exerciseDB || typeof exerciseDB !== 'object' || Array.isArray(exerciseDB) ||
        !Array.isArray(exerciseDB.bodyParts)) {
      return false;
    }

    const keys = ['fitlog_sessions', 'fitlog_bodyMetrics', 'fitlog_routines', 'fitlog_exerciseDB'];
    const snapshot = keys.map(function(key) { return localStorage.getItem(key); });

    const ok = this.saveSessions(sessions) &&
      this.saveBodyMetrics(bodyMetrics) &&
      this.saveRoutines(routines) &&
      this.saveExerciseDB(exerciseDB);

    if (!ok) {
      keys.forEach(function(key, i) {
        if (snapshot[i] === null) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, snapshot[i]);
        }
      });
      return false;
    }

    return true;
  }
};
