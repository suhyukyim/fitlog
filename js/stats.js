// 통계 탭: 종목별 1RM 추이 + 운동 볼륨(주간/월간) 추이.
(function() {
  const state = {
    selectedExercise: null, // 선택된 종목명(세션 재렌더 간 유지, 새로고침 시 초기화 OK)
    volumePeriod: 'week'    // 'week' | 'month'
  };

  FitLog.stats = {
    render: function() {
      renderExerciseSection();
      renderVolumeSection();
    }
  };

  function formatShortDate(dateStr) {
    const parts = dateStr.split('-').map(Number);
    return parts[1] + '/' + parts[2];
  }

  function roundNum(v) {
    return Math.round(v * 10) / 10;
  }

  // ---------- 종목 목록 ----------

  // 1RM은 근력 종목에만 의미가 있으므로 time/cardio 스냅샷 종목은 목록에서 제외
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

  // ---------- 1RM 계산 ----------

  // 선택 종목이 포함된 세션마다 세트 중 Epley 1RM 최댓값 하나를 점으로 반환(날짜 오름차순).
  function computeOneRMSeries(sessions, exerciseName) {
    const series = [];
    sessions.forEach(function(s) {
      const ex = (s.exercises || []).find(function(e) { return e.name === exerciseName; });
      if (!ex || !ex.sets || ex.sets.length === 0) return;

      let maxOneRM = null;
      ex.sets.forEach(function(set) {
        if (set.weight === undefined) return;
        const weight = Number(set.weight) || 0;
        const reps = Number(set.reps) || 0;
        const oneRM = weight * (1 + reps / 30);
        if (maxOneRM === null || oneRM > maxOneRM) {
          maxOneRM = oneRM;
        }
      });

      if (maxOneRM !== null) {
        series.push({ date: s.date, oneRM: maxOneRM });
      }
    });

    series.sort(function(a, b) { return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0); });
    return series;
  }

  function renderExerciseSection() {
    const area = document.getElementById('stats-1rm-area');
    if (!area) return;
    area.innerHTML = '';

    const card = document.createElement('div');
    card.className = 'card';

    const heading = document.createElement('h3');
    heading.textContent = '종목별 1RM 추이';
    card.appendChild(heading);

    const sessions = FitLog.storage.getSessions();
    const names = getAllExerciseNames(sessions);

    if (names.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'chart-empty';
      empty.textContent = '운동 기록이 없습니다';
      card.appendChild(empty);
      area.appendChild(card);
      return;
    }

    if (state.selectedExercise === null || names.indexOf(state.selectedExercise) === -1) {
      state.selectedExercise = names[0];
    }

    const select = document.createElement('select');
    select.className = 'select-input';
    select.id = 'stats-exercise-select';
    names.forEach(function(name) {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      if (name === state.selectedExercise) opt.selected = true;
      select.appendChild(opt);
    });

    const chartArea = document.createElement('div');
    chartArea.id = 'stats-1rm-chart';

    select.addEventListener('change', function() {
      state.selectedExercise = select.value;
      drawOneRMChart(chartArea, sessions, state.selectedExercise);
    });

    card.appendChild(select);
    card.appendChild(chartArea);
    area.appendChild(card);

    drawOneRMChart(chartArea, sessions, state.selectedExercise);
  }

  function drawOneRMChart(chartArea, sessions, exerciseName) {
    const series = computeOneRMSeries(sessions, exerciseName);
    const points = series.map(function(item) {
      return { x: formatShortDate(item.date), y: roundNum(item.oneRM) };
    });
    FitLog.charts.lineChart(chartArea, points, { unit: 'kg' });
  }

  // ---------- 볼륨 집계 ----------

  // dateStr('YYYY-MM-DD')이 속한 주의 월요일을 로컬 기준으로 계산.
  function mondayOf(dateStr) {
    const parts = dateStr.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const day = d.getDay(); // 0=일 .. 6=토
    const diff = day === 0 ? -6 : 1 - day;
    return new Date(parts[0], parts[1] - 1, parts[2] + diff);
  }

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

  // period: 'week' | 'month'. 반환: [{sortKey, label, total}] 오름차순, 최근 12개만.
  function computeVolumeBuckets(sessions, period) {
    const buckets = {};

    sessions.forEach(function(s) {
      let key, label;
      if (period === 'month') {
        key = s.date.slice(0, 7); // 'YYYY-MM'
        const month = Number(s.date.split('-')[1]);
        label = month + '월';
      } else {
        const monday = mondayOf(s.date);
        key = FitLog.storage.todayStr(monday);
        label = (monday.getMonth() + 1) + '/' + monday.getDate() + '주';
      }

      if (!buckets[key]) {
        buckets[key] = { sortKey: key, label: label, total: 0 };
      }
      buckets[key].total += sessionVolume(s);
    });

    let list = Object.keys(buckets).map(function(k) { return buckets[k]; });
    list.sort(function(a, b) { return a.sortKey < b.sortKey ? -1 : (a.sortKey > b.sortKey ? 1 : 0); });

    if (list.length > 12) {
      list = list.slice(list.length - 12);
    }
    return list;
  }

  function renderVolumeSection() {
    const area = document.getElementById('stats-volume-area');
    if (!area) return;
    area.innerHTML = '';

    const card = document.createElement('div');
    card.className = 'card';

    const heading = document.createElement('h3');
    heading.textContent = '운동 볼륨';
    card.appendChild(heading);

    const toggleWrap = document.createElement('div');
    toggleWrap.className = 'period-btns';

    const weekBtn = document.createElement('button');
    weekBtn.type = 'button';
    weekBtn.className = 'btn period-btn';
    weekBtn.textContent = '주간';
    if (state.volumePeriod === 'week') weekBtn.classList.add('active');
    weekBtn.addEventListener('click', function() {
      if (state.volumePeriod === 'week') return;
      state.volumePeriod = 'week';
      renderVolumeSection();
    });

    const monthBtn = document.createElement('button');
    monthBtn.type = 'button';
    monthBtn.className = 'btn period-btn';
    monthBtn.textContent = '월간';
    if (state.volumePeriod === 'month') monthBtn.classList.add('active');
    monthBtn.addEventListener('click', function() {
      if (state.volumePeriod === 'month') return;
      state.volumePeriod = 'month';
      renderVolumeSection();
    });

    toggleWrap.appendChild(weekBtn);
    toggleWrap.appendChild(monthBtn);
    card.appendChild(toggleWrap);

    const chartArea = document.createElement('div');
    chartArea.id = 'stats-volume-chart';
    card.appendChild(chartArea);

    area.appendChild(card);

    const sessions = FitLog.storage.getSessions();
    const buckets = computeVolumeBuckets(sessions, state.volumePeriod);
    const points = buckets.map(function(b) { return { x: b.label, y: roundNum(b.total) }; });
    FitLog.charts.lineChart(chartArea, points, { unit: 'kg' });
  }
})();
