# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

FitLog — 개인용 헬스 트래커 웹앱 (운동 기록/체중/통계/루틴). 서버·로그인·빌드 도구 없음.
설계 문서: `docs/superpowers/specs/2026-07-04-fitlog-design.md`
구현 계획: `docs/superpowers/plans/2026-07-04-fitlog.md`

## Running & Verifying

- 실행: `index.html`을 브라우저에서 직접 연다 (`file://`로 완전 동작해야 함).
- 테스트 프레임워크 없음. 검증은 브라우저 수동 확인 + `node --check js/*.js` (문법).
- 외부 라이브러리/CDN/폰트 금지. 그래프는 SVG 직접 구현.

## Architecture

- ES 모듈 금지. `index.html`의 일반 `<script>` 태그 로드 순서가 곧 의존성 순서:
  `ui.js → data.js → storage.js → (기능 모듈들) → app.js`
- `window.FitLog` 전역 네임스페이스는 **ui.js 최상단**에서 생성. 각 파일은 `FitLog.ui`,
  `FitLog.storage`, `FitLog.workout` 등 하위 객체 하나를 소유 (파일당 책임 1개).
- 렌더링: 탭마다 자체 `render()` 함수. 데이터 변경 시 해당 탭만 다시 그림.
  탭 전환은 `FitLog.ui.switchTab(tabId)` (`'workout' | 'body' | 'stats' | 'routines'`).
- 데이터는 localStorage 키 4개에 즉시 저장 (이 4개 외 추가 금지):
  `fitlog_sessions`, `fitlog_bodyMetrics`, `fitlog_routines`, `fitlog_exerciseDB`
- 세션은 날짜당 1개. 날짜 문자열은 로컬 타임존 기준 `YYYY-MM-DD`
  (`FitLog.storage.todayStr()` 사용 — `toISOString()` 금지, UTC 밀림).
- 1RM 추정: Epley 공식 `weight * (1 + reps / 30)`.

## Conventions

- UI 문구 전부 한국어. 다크모드 기본(팔레트는 `css/style.css`의 CSS 변수). 모바일 우선,
  터치 영역 최소 44px, `main`은 max-width 560px.
- 커밋 메시지는 한국어, 끝에 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- `.superpowers/sdd/`는 subagent-driven-development 진행 기록(렛저·브리프·리포트)이며
  앱 코드가 아님.
