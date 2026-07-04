// 공용 SVG 꺾은선 그래프. bodyMetrics 등 특정 도메인 지식은 두지 않는다(범용, Task 6 통계 탭도 재사용).
(function() {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const VIEW_WIDTH = 560;
  const PADDING = { top: 16, right: 16, bottom: 28, left: 44 };
  const Y_TICKS = 5;

  FitLog.charts = {
    // container: DOM 엘리먼트. points: [{x: string, y: number}] (표시 순서 그대로 사용).
    // options: { unit?: string, height?: number }
    lineChart: function(container, points, options) {
      if (!container) return;
      const opts = options || {};
      const unit = opts.unit || '';
      const height = opts.height || 220;

      container.innerHTML = '';

      if (!points || points.length <= 1) {
        const msg = document.createElement('p');
        msg.className = 'chart-empty';
        msg.textContent = '데이터가 부족합니다';
        container.appendChild(msg);
        return;
      }

      const plotW = VIEW_WIDTH - PADDING.left - PADDING.right;
      const plotH = height - PADDING.top - PADDING.bottom;

      const values = points.map(function(p) { return p.y; });
      let min = Math.min.apply(null, values);
      let max = Math.max.apply(null, values);

      if (min === max) {
        // 값이 모두 같으면 선이 화면 중앙에 오도록 고정 폭만큼 패딩.
        const pad = min === 0 ? 1 : Math.abs(min) * 0.1;
        min -= pad;
        max += pad;
      } else {
        const range = max - min;
        min -= range * 0.1;
        max += range * 0.1;
      }

      function xFor(i) {
        return PADDING.left + (i / (points.length - 1)) * plotW;
      }
      function yFor(v) {
        return PADDING.top + plotH - ((v - min) / (max - min)) * plotH;
      }
      function fmt(v) {
        return Math.round(v * 10) / 10;
      }

      const svg = document.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('viewBox', '0 0 ' + VIEW_WIDTH + ' ' + height);
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', height);
      svg.setAttribute('class', 'line-chart');
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

      // y축 눈금(4~5개) + 격자선
      for (let t = 0; t < Y_TICKS; t++) {
        const v = min + (max - min) * (t / (Y_TICKS - 1));
        const y = yFor(v);

        const grid = document.createElementNS(SVG_NS, 'line');
        grid.setAttribute('x1', PADDING.left);
        grid.setAttribute('x2', VIEW_WIDTH - PADDING.right);
        grid.setAttribute('y1', y);
        grid.setAttribute('y2', y);
        grid.setAttribute('class', 'chart-gridline');
        svg.appendChild(grid);

        const label = document.createElementNS(SVG_NS, 'text');
        label.setAttribute('x', PADDING.left - 6);
        label.setAttribute('y', y);
        label.setAttribute('class', 'chart-axis-label');
        label.setAttribute('text-anchor', 'end');
        label.setAttribute('dominant-baseline', 'middle');
        label.textContent = fmt(v) + (unit ? unit : '');
        svg.appendChild(label);
      }

      // x축 라벨: 처음/중간/끝
      const midIdx = Math.floor((points.length - 1) / 2);
      const xIdxSet = [];
      [0, midIdx, points.length - 1].forEach(function(i) {
        if (xIdxSet.indexOf(i) === -1) xIdxSet.push(i);
      });
      xIdxSet.forEach(function(i) {
        const label = document.createElementNS(SVG_NS, 'text');
        label.setAttribute('x', xFor(i));
        label.setAttribute('y', height - 6);
        label.setAttribute('class', 'chart-axis-label');
        let anchor = 'middle';
        if (i === 0) anchor = 'start';
        else if (i === points.length - 1) anchor = 'end';
        label.setAttribute('text-anchor', anchor);
        label.textContent = points[i].x;
        svg.appendChild(label);
      });

      // 꺾은선
      const coords = points.map(function(p, i) {
        return xFor(i) + ',' + yFor(p.y);
      }).join(' ');
      const polyline = document.createElementNS(SVG_NS, 'polyline');
      polyline.setAttribute('points', coords);
      polyline.setAttribute('class', 'chart-line');
      svg.appendChild(polyline);

      // 데이터 점
      points.forEach(function(p, i) {
        const circle = document.createElementNS(SVG_NS, 'circle');
        circle.setAttribute('cx', xFor(i));
        circle.setAttribute('cy', yFor(p.y));
        circle.setAttribute('r', 3);
        circle.setAttribute('class', 'chart-dot');
        svg.appendChild(circle);
      });

      container.appendChild(svg);
    }
  };
})();
