import { UserLearningState } from '@/types';

const STORAGE_PREFIX = 'cw2_state_';

export function getInitialUserState(username: string): UserLearningState {
  return {
    username,
    completedWordIds: [],
    masteredChars: [],
    wrongWords: {},
    wrongChars: {},
    currentIndex: 0,
    gradeFilter: 'all',
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
  };
}

export function loadUserState(username: string): UserLearningState {
  if (typeof window === 'undefined') {
    return getInitialUserState(username);
  }
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${username}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...getInitialUserState(username),
        ...parsed,
        username, // guarantee correct user
      };
    }
  } catch (e) {
    console.error('Failed to load user state from localStorage:', e);
  }
  return getInitialUserState(username);
}

export function saveUserState(state: UserLearningState): void {
  if (typeof window === 'undefined') return;
  try {
    state.lastActiveAt = Date.now();
    localStorage.setItem(`${STORAGE_PREFIX}${state.username}`, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save user state to localStorage:', e);
  }
}

// Convert user mistakes to CSV with UTF-8 BOM
export function generateMistakesCSV(state: UserLearningState): string {
  const rows: string[] = [];
  rows.push(['类型', '内容', '拼音', '年级/出处', '释义', '错误次数', '连写3遍完成状态', '重考掌握状态'].join(','));

  // Wrong words
  Object.values(state.wrongWords).forEach(item => {
    const cleanExp = `"${(item.explanation || '').replace(/"/g, '""')}"`;
    rows.push([
      '错词',
      `"${item.word}"`,
      `"${item.pinyin}"`,
      `"${item.grade}"`,
      cleanExp,
      item.mistakeCount,
      item.practiceRoundsDone >= 3 ? '已完成3遍' : `进行中(${item.practiceRoundsDone}/3)`,
      item.retestPassed ? '重考已通过' : '待重考',
    ].join(','));
  });

  // Wrong chars
  Object.values(state.wrongChars).forEach(item => {
    rows.push([
      '错字',
      `"${item.char}"`,
      `"${item.pinyin}"`,
      `"出处: ${item.wordSource}"`,
      '单字',
      item.mistakeCount,
      item.practiceRoundsDone >= 3 ? '已完成3遍' : `进行中(${item.practiceRoundsDone}/3)`,
      item.retestPassed ? '重考已通过' : '待重考',
    ].join(','));
  });

  // Add UTF-8 BOM (\uFEFF) for Excel compatibility
  return '\uFEFF' + rows.join('\r\n');
}
