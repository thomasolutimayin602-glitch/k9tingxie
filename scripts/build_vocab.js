const fs = require('fs');
const path = require('path');
const { pinyin } = require('pinyin-pro');

console.log('Loading datasets...');
const charsText = fs.readFileSync('chars3500.txt', 'utf-8');
const targetChars = Array.from(new Set(charsText.split('').filter(c => /[\u4e00-\u9fff]/.test(c))));
console.log(`Target characters: ${targetChars.length}`);
const targetSet = new Set(targetChars);

const idiomsRaw = JSON.parse(fs.readFileSync('idioms.json', 'utf-8'));
const cleanIdioms = idiomsRaw.filter(item => {
  const w = item.word || '';
  return w.length === 4 && /^[\u4e00-\u9fff]+$/.test(w);
});
console.log(`Clean 4-char idioms: ${cleanIdioms.length}`);

const ciRaw = JSON.parse(fs.readFileSync('ci.json', 'utf-8'));
const cleanCi = ciRaw.filter(item => {
  const w = item.ci || '';
  return (w.length === 2 || w.length === 3) && /^[\u4e00-\u9fff]+$/.test(w);
});
console.log(`Clean 2-3 char words: ${cleanCi.length}`);

// Pre-index by char
const charToIdioms = new Map();
for (const item of cleanIdioms) {
  for (const c of item.word) {
    if (targetSet.has(c)) {
      if (!charToIdioms.has(c)) charToIdioms.set(c, []);
      charToIdioms.get(c).push(item);
    }
  }
}

const charToCi = new Map();
for (const item of cleanCi) {
  for (const c of item.ci) {
    if (targetSet.has(c)) {
      if (!charToCi.has(c)) charToCi.set(c, []);
      charToCi.get(c).push(item);
    }
  }
}

// Favor idioms with rich explanation/example
cleanIdioms.sort((a, b) => {
  const scoreA = (a.explanation?.length || 0) + (a.example?.length || 0);
  const scoreB = (b.explanation?.length || 0) + (b.example?.length || 0);
  return scoreB - scoreA;
});

const covered = new Set();
const usedWords = new Set();
const selected = [];

// Greedy rounds on 4-char idioms
for (const minNew of [4, 3, 2]) {
  for (const item of cleanIdioms) {
    const w = item.word;
    if (usedWords.has(w)) continue;
    const newChars = [];
    for (const c of w) {
      if (targetSet.has(c) && !covered.has(c)) {
        newChars.push(c);
      }
    }
    if (newChars.length >= minNew) {
      usedWords.add(w);
      for (const c of newChars) covered.add(c);
      selected.push({
        word: w,
        explanation: item.explanation || item.derivation || '四字成语',
        type: '成语 (4字)',
        newChars
      });
    }
  }
}

console.log(`After 4-char idioms: ${selected.length} words, covering ${covered.size} / ${targetChars.length} characters.`);

// Now for remaining characters, pick from cleanCi
cleanCi.sort((a, b) => (b.explanation?.length || 0) - (a.explanation?.length || 0));

for (const minNew of [3, 2, 1]) {
  for (const c of targetChars) {
    if (covered.has(c)) continue;
    const candidates = charToCi.get(c) || [];
    for (const item of candidates) {
      const w = item.ci;
      if (usedWords.has(w)) continue;
      const newChars = [];
      for (const ch of w) {
        if (targetSet.has(ch) && !covered.has(ch)) {
          newChars.push(ch);
        }
      }
      if (newChars.length >= minNew) {
        usedWords.add(w);
        for (const ch of newChars) covered.add(ch);
        selected.push({
          word: w,
          explanation: item.explanation || '常见词语',
          type: `${w.length}字词`,
          newChars
        });
        break;
      }
    }
  }
}

// Fallback supplement for remaining 16 chars
const fallbackWords = [
  { word: '啤酒', explanation: '麦芽发酵饮料' },
  { word: '菠萝', explanation: '热带凤梨科水果' },
  { word: '碘酒', explanation: '碘与碘化钾的酒精溶液，消毒药水' },
  { word: '镀金', explanation: '在器物表面用电解等方法镀上一层薄金' },
  { word: '缤纷', explanation: '繁多而杂乱，如五彩缤纷' },
  { word: '惦记', explanation: '心中牵挂，挂念' },
  { word: '嘀咕', explanation: '私下低声说话或自言自语' },
  { word: '俺们', explanation: '我们（北方方言）' },
  { word: '搞好', explanation: '把事情办好、做好' },
  { word: '叼着', explanation: '用嘴夹住、衔着' },
  { word: '白桦', explanation: '落叶乔木，树皮白色' },
  { word: '赣江', explanation: '江西省主要河流' },
  { word: '佘太君', explanation: '杨家将故事中的巾帼女英雄' },
  { word: '大写叁', explanation: '大写汉字数字3' },
  { word: '大写柒', explanation: '大写汉字数字7' },
  { word: '大写捌', explanation: '大写汉字数字8' },
];

for (const fb of fallbackWords) {
  const newChars = [];
  for (const c of fb.word) {
    if (targetSet.has(c) && !covered.has(c)) {
      newChars.push(c);
      covered.add(c);
    }
  }
  if (newChars.length > 0 && !usedWords.has(fb.word)) {
    usedWords.add(fb.word);
    selected.push({
      word: fb.word,
      explanation: fb.explanation,
      type: `${fb.word.length}字词`,
      newChars
    });
  }
}

console.log(`Final coverage: ${covered.size} / ${targetChars.length} characters covered.`);
console.log(`Total selected words: ${selected.length}`);

// Grade assignment logic:
// Chinese curriculum character bands:
// Grade 1-2: Index 0 - 800 in common characters
// Grade 3-4: Index 800 - 1600
// Grade 5-6: Index 1600 - 2500
// Grade 7-9: Index 2500 - 3500
const charGradeMap = new Map();
targetChars.forEach((c, idx) => {
  if (idx < 800) charGradeMap.set(c, '1-2年级');
  else if (idx < 1600) charGradeMap.set(c, '3-4年级');
  else if (idx < 2500) charGradeMap.set(c, '5-6年级');
  else charGradeMap.set(c, '7-9年级');
});

// Format finalized vocabulary items
const finalized = selected.map((item, idx) => {
  const chars = item.word.split('');
  const pinyinArr = pinyin(item.word, { type: 'array', toneType: 'symbol' });
  const pinyinFull = pinyin(item.word, { toneType: 'symbol' });

  // Calculate word grade by the maximum grade of newly introduced characters
  let maxGradeScore = 1;
  const gradeScoreMap = { '1-2年级': 1, '3-4年级': 2, '5-6年级': 3, '7-9年级': 4 };
  for (const c of chars) {
    const g = charGradeMap.get(c) || '3-4年级';
    if (gradeScoreMap[g] > maxGradeScore) {
      maxGradeScore = gradeScoreMap[g];
    }
  }
  const gradeNames = { 1: '小学低段（1-2年级）', 2: '小学中段（3-4年级）', 3: '小学高段（5-6年级）', 4: '初中阶段（7-9年级）' };
  const gradeKeyMap = { 1: 'g1-2', 2: 'g3-4', 3: 'g5-6', 4: 'g7-9' };

  return {
    id: `w_${idx + 1}`,
    word: item.word,
    pinyin: pinyinFull,
    pinyinArr,
    chars,
    grade: gradeNames[maxGradeScore],
    gradeKey: gradeKeyMap[maxGradeScore],
    type: item.type,
    explanation: item.explanation.replace(/\\n/g, ' ').slice(0, 150),
    newChars: item.newChars
  };
});

// Sort by gradeKey so practice naturally progresses from 1-2 to 7-9 grade!
const gradeOrder = { 'g1-2': 1, 'g3-4': 2, 'g5-6': 3, 'g7-9': 4 };
finalized.sort((a, b) => {
  if (gradeOrder[a.gradeKey] !== gradeOrder[b.gradeKey]) {
    return gradeOrder[a.gradeKey] - gradeOrder[b.gradeKey];
  }
  // within same grade, 4-char idioms first, then 2-3 char words
  return b.chars.length - a.chars.length;
});

// Re-index IDs cleanly
finalized.forEach((item, idx) => {
  item.id = `w_${String(idx + 1).padStart(4, '0')}`;
});

const outPath = path.join(__dirname, '../src/data/vocabulary.json');
fs.writeFileSync(outPath, JSON.stringify(finalized, null, 2), 'utf-8');
console.log(`Saved ${finalized.length} vocabulary words to ${outPath}`);

// Also print grade distribution
const counts = {};
finalized.forEach(item => {
  counts[item.grade] = (counts[item.grade] || 0) + 1;
});
console.log('Grade distribution:', counts);
