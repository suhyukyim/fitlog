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
