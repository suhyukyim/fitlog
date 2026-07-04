(function() {
  const PERIOD_OPTIONS = [
    { label: '7일', value: 7 },
    { label: '30일', value: 30 },
    { label: '90일', value: 90 },
    { label: '전체', value: 'all' }
  ];

  FitLog.body = {
    period: 30, // 7 | 30 | 90 | 'all'

    render: function() {
      renderForm(this);
      renderPeriodButtons(this);
      renderChartAndList(this);
    }
  };

  function fmtNum(v) {
    // 부동소수점 오차 제거 + 불필요한 소수점 자리 제거(자바스크립트 숫자 표시 특성 이용).
    return Math.round(v * 10) / 10;
  }

  function formatShortDate(dateStr) {
    const parts = dateStr.split('-').map(Number);
    return parts[1] + '/' + parts[2];
  }

  // ---------- 입력 폼 ----------

  function renderForm(bodyState) {
    const area = document.getElementById('body-form-area');
    if (!area) return;
    area.innerHTML = '';

    const card = document.createElement('div');
    card.className = 'card body-form-card';

    const dateLabel = document.createElement('label');
    dateLabel.className = 'form-label';
    dateLabel.textContent = '날짜';
    dateLabel.setAttribute('for', 'body-date-input');

    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.id = 'body-date-input';
    dateInput.className = 'body-input';
    dateInput.value = FitLog.storage.todayStr();
    dateInput.required = true;

    const weightLabel = document.createElement('label');
    weightLabel.className = 'form-label';
    weightLabel.textContent = '체중(kg)';
    weightLabel.setAttribute('for', 'body-weight-input');

    const weightInput = document.createElement('input');
    weightInput.type = 'number';
    weightInput.id = 'body-weight-input';
    weightInput.className = 'body-input';
    weightInput.step = '0.1';
    weightInput.placeholder = '예: 72.5';
    weightInput.required = true;

    const fatLabel = document.createElement('label');
    fatLabel.className = 'form-label';
    fatLabel.textContent = '체지방률(%) (선택)';
    fatLabel.setAttribute('for', 'body-fat-input');

    const fatInput = document.createElement('input');
    fatInput.type = 'number';
    fatInput.id = 'body-fat-input';
    fatInput.className = 'body-input';
    fatInput.step = '0.1';
    fatInput.placeholder = '예: 18.2';

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'btn btn-primary body-save-btn';
    saveBtn.textContent = '저장';
    saveBtn.addEventListener('click', function() {
      handleSave(bodyState, dateInput.value, weightInput.value, fatInput.value);
    });

    card.appendChild(dateLabel);
    card.appendChild(dateInput);
    card.appendChild(weightLabel);
    card.appendChild(weightInput);
    card.appendChild(fatLabel);
    card.appendChild(fatInput);
    card.appendChild(saveBtn);

    area.appendChild(card);
  }

  // 날짜 필수, 체중 20~300, 체지방 빈 값 허용 / 값 있으면 0~70
  function validateInputs(dateStr, weightStr, fatStr) {
    if (!dateStr) {
      return { ok: false, message: '날짜를 입력하세요' };
    }

    const weight = parseFloat(weightStr);
    if (!isFinite(weight) || weight < 20 || weight > 300) {
      return { ok: false, message: '체중은 20~300 사이여야 합니다' };
    }

    let bodyFat = null;
    const fatTrim = (fatStr === undefined || fatStr === null) ? '' : String(fatStr).trim();
    if (fatTrim !== '') {
      bodyFat = parseFloat(fatTrim);
      if (!isFinite(bodyFat) || bodyFat < 0 || bodyFat > 70) {
        return { ok: false, message: '체지방률은 0~70 사이여야 합니다' };
      }
    }

    return { ok: true, value: { date: dateStr, weight: weight, bodyFat: bodyFat } };
  }

  function handleSave(bodyState, dateStr, weightStr, fatStr) {
    const result = validateInputs(dateStr, weightStr, fatStr);
    if (!result.ok) {
      FitLog.ui.toast(result.message);
      return;
    }

    const metrics = FitLog.storage.getBodyMetrics();
    const existingIdx = metrics.findIndex(function(m) { return m.date === result.value.date; });

    const entry = { date: result.value.date, weight: result.value.weight };
    if (result.value.bodyFat !== null) {
      entry.bodyFat = result.value.bodyFat;
    }

    const overwritten = existingIdx >= 0;
    if (overwritten) {
      metrics[existingIdx] = entry;
    } else {
      metrics.push(entry);
    }

    FitLog.storage.saveBodyMetrics(metrics);
    FitLog.ui.toast(overwritten ? '덮어썼습니다' : '저장했습니다');
    bodyState.render();
  }

  // ---------- 기간 선택 ----------

  function renderPeriodButtons(bodyState) {
    const area = document.getElementById('body-period-area');
    if (!area) return;
    area.innerHTML = '';

    const wrap = document.createElement('div');
    wrap.className = 'period-btns';

    PERIOD_OPTIONS.forEach(function(opt) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn period-btn';
      if (bodyState.period === opt.value) btn.classList.add('active');
      btn.textContent = opt.label;
      btn.addEventListener('click', function() {
        bodyState.period = opt.value;
        renderPeriodButtons(bodyState);
        renderChartAndList(bodyState);
      });
      wrap.appendChild(btn);
    });

    area.appendChild(wrap);
  }

  // 기준: 오늘로부터 N일 이내(오늘 포함, 오늘-N일 ~ 오늘)
  function filterByPeriod(metrics, period) {
    if (period === 'all') {
      return metrics.slice();
    }
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - period);
    const cutoffStr = FitLog.storage.todayStr(cutoff);
    return metrics.filter(function(m) { return m.date >= cutoffStr; });
  }

  // ---------- 그래프 + 목록 ----------

  function renderChartAndList(bodyState) {
    const metrics = FitLog.storage.getBodyMetrics();

    const chartArea = document.getElementById('body-chart-area');
    if (chartArea) {
      const filtered = filterByPeriod(metrics, bodyState.period).slice().sort(function(a, b) {
        return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0);
      });
      const points = filtered.map(function(m) {
        return { x: formatShortDate(m.date), y: m.weight };
      });
      FitLog.charts.lineChart(chartArea, points, { unit: 'kg' });
    }

    const listArea = document.getElementById('body-list-area');
    if (listArea) {
      listArea.innerHTML = '';
      const sorted = metrics.slice().sort(function(a, b) {
        return a.date < b.date ? 1 : (a.date > b.date ? -1 : 0);
      });
      const top20 = sorted.slice(0, 20);

      if (top20.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'body-list-empty';
        empty.textContent = '기록이 없습니다';
        listArea.appendChild(empty);
      } else {
        top20.forEach(function(m) {
          listArea.appendChild(buildListItem(bodyState, m));
        });
      }
    }
  }

  function buildListItem(bodyState, m) {
    const row = document.createElement('div');
    row.className = 'list-item body-list-item';

    const label = document.createElement('span');
    label.className = 'body-list-label';
    let text = formatShortDate(m.date) + ' ' + fmtNum(m.weight) + 'kg';
    if (m.bodyFat !== null && m.bodyFat !== undefined) {
      text += ' (체지방 ' + fmtNum(m.bodyFat) + '%)';
    }
    label.textContent = text;

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'icon-btn';
    delBtn.textContent = '🗑';
    delBtn.setAttribute('aria-label', '기록 삭제');
    delBtn.addEventListener('click', function() {
      FitLog.ui.confirm(formatShortDate(m.date) + ' 기록을 삭제할까요?', function() {
        removeEntry(bodyState, m.date);
        FitLog.ui.toast('삭제했습니다');
      });
    });

    row.appendChild(label);
    row.appendChild(delBtn);
    return row;
  }

  function removeEntry(bodyState, date) {
    let metrics = FitLog.storage.getBodyMetrics();
    metrics = metrics.filter(function(m) { return m.date !== date; });
    FitLog.storage.saveBodyMetrics(metrics);
    bodyState.render();
  }
})();
