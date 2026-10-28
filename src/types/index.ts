export interface WordItem {
  id: string;
  word: string;
  pinyin: string;
  pinyinArr: string[];
  chars: string[];
  grade: string;
  gradeKey: 'g1-2' | 'g3-4' | 'g5-6' | 'g7-9';
  type: string;
  explanation: string;
  newChars: string[];
}

export interface WrongWord {
  id: string;
  word: string;
  pinyin: string;
  pinyinArr: string[];
  explanation: string;
  grade: string;
  mistakeCount: number;
  practiceRoundsDone: number;
  retestPassed: boolean;
  lastFailedAt: number;
}

export interface WrongChar {
  char: string;
  pinyin: string;
  wordSource: string;
  mistakeCount: number;
  practiceRoundsDone: number;
  retestPassed: boolean;
  lastFailedAt: number;
}

export interface UserLearningState {
  username: string;
  completedWordIds: string[];
  masteredChars: string[];
  wrongWords: Record<string, WrongWord>;
  wrongChars: Record<string, WrongChar>;
  currentIndex: number;
  gradeFilter: 'all' | 'g1-2' | 'g3-4' | 'g5-6' | 'g7-9';
  createdAt: number;
  lastActiveAt: number;
}

export type AppTab = 'dictation' | 'mistakes' | 'summary' | 'print';
