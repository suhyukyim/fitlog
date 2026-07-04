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
  }
};
