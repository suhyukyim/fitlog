FitLog.storage = {
  load(key) {
    try {
      const val = localStorage.getItem(key);
      return val === null ? null : JSON.parse(val);
    } catch (e) {
      return null;
    }
  },

  save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  getSessions() {
    return this.load('fitlog_sessions') || [];
  },

  saveSessions(arr) {
    this.save('fitlog_sessions', arr);
  },

  getBodyMetrics() {
    return this.load('fitlog_bodyMetrics') || [];
  },

  saveBodyMetrics(arr) {
    this.save('fitlog_bodyMetrics', arr);
  },

  getRoutines() {
    return this.load('fitlog_routines') || [];
  },

  saveRoutines(arr) {
    this.save('fitlog_routines', arr);
  },

  getExerciseDB() {
    return this.load('fitlog_exerciseDB') || { bodyParts: [] };
  },

  saveExerciseDB(db) {
    this.save('fitlog_exerciseDB', db);
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
  // localStorage 키도 건드리지 않은 채 false를 반환).
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

    this.saveSessions(sessions);
    this.saveBodyMetrics(bodyMetrics);
    this.saveRoutines(routines);
    this.saveExerciseDB(exerciseDB);
    return true;
  }
};
