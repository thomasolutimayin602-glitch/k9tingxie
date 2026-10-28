'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { WordItem, UserLearningState, WrongWord, WrongChar } from '@/types';
import rawVocabData from '@/data/vocabulary.json';
import { loadUserState, saveUserState, getInitialUserState } from '@/utils/storage';

const vocabularyData = rawVocabData as WordItem[];

interface LearningContextType {
  allWords: WordItem[];
  filteredWords: WordItem[];
  currentWord: WordItem | null;
  currentIndex: number;
  totalInFilter: number;
  gradeFilter: 'all' | 'g1-2' | 'g3-4' | 'g5-6' | 'g7-9';
  setGradeFilter: (filter: 'all' | 'g1-2' | 'g3-4' | 'g5-6' | 'g7-9') => void;
  userState: UserLearningState;
  
  // Navigation
  goToNextWord: () => void;
  goToPrevWord: () => void;
  jumpToWord: (index: number) => void;
  
  // Results
  onWordCompleteSuccess: (word: WordItem) => void;
  onSingleCharMistake: (char: string, pinyin: string, word: WordItem) => void;
  onWholeWordMistake: (word: WordItem) => void;
  updatePracticeProgress: (type: 'char' | 'word', key: string, rounds: number) => void;
  markRetestSuccess: (type: 'char' | 'word', key: string) => void;
  clearUserData: () => void;

  // Stats
  totalCharactersCount: number;
  masteredCharactersCount: number;
  wrongWordsCount: number;
  wrongCharsCount: number;
  isCompletedAll: boolean;
}

const LearningContext = createContext<LearningContextType | undefined>(undefined);

export function LearningProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [userState, setUserState] = useState<UserLearningState>(() =>
    user ? loadUserState(user) : getInitialUserState('gamer')
  );

  // Sync state when user changes
  useEffect(() => {
    if (user) {
      const loaded = loadUserState(user);
      setUserState(loaded);
    }
  }, [user]);

  // Persist state on change
  useEffect(() => {
    if (user && userState.username === user) {
      saveUserState(userState);
    }
  }, [user, userState]);

  // Filter words by grade
  const filteredWords = useMemo(() => {
    if (userState.gradeFilter === 'all') return vocabularyData;
    return vocabularyData.filter(item => item.gradeKey === userState.gradeFilter);
  }, [userState.gradeFilter]);

  const currentIndex = Math.min(Math.max(0, userState.currentIndex), Math.max(0, filteredWords.length - 1));
  const currentWord = filteredWords[currentIndex] || null;

  const setGradeFilter = useCallback((filter: 'all' | 'g1-2' | 'g3-4' | 'g5-6' | 'g7-9') => {
    setUserState(prev => ({
      ...prev,
      gradeFilter: filter,
      currentIndex: 0,
    }));
  }, []);

  const goToNextWord = useCallback(() => {
    setUserState(prev => {
      const nextIdx = Math.min(prev.currentIndex + 1, filteredWords.length - 1);
      return { ...prev, currentIndex: nextIdx };
    });
  }, [filteredWords.length]);

  const goToPrevWord = useCallback(() => {
    setUserState(prev => {
      const prevIdx = Math.max(0, prev.currentIndex - 1);
      return { ...prev, currentIndex: prevIdx };
    });
  }, []);

  const jumpToWord = useCallback((index: number) => {
    setUserState(prev => ({
      ...prev,
      currentIndex: Math.min(Math.max(0, index), filteredWords.length - 1),
    }));
  }, [filteredWords.length]);

  // Success: user wrote all characters in the word cleanly
  const onWordCompleteSuccess = useCallback((word: WordItem) => {
    setUserState(prev => {
      const newCompleted = Array.from(new Set([...prev.completedWordIds, word.id]));
      const newMastered = Array.from(new Set([...prev.masteredChars, ...word.chars]));
      return {
        ...prev,
        completedWordIds: newCompleted,
        masteredChars: newMastered,
      };
    });
  }, []);

  // Some character in the word had a stroke order or glyph mistake
  const onSingleCharMistake = useCallback((char: string, pinyin: string, word: WordItem) => {
    setUserState(prev => {
      const existing = prev.wrongChars[char] || {
        char,
        pinyin,
        wordSource: word.word,
        mistakeCount: 0,
        practiceRoundsDone: 0,
        retestPassed: false,
        lastFailedAt: Date.now(),
      };

      const updatedChar: WrongChar = {
        ...existing,
        mistakeCount: existing.mistakeCount + 1,
        retestPassed: false,
        lastFailedAt: Date.now(),
      };

      return {
        ...prev,
        wrongChars: {
          ...prev.wrongChars,
          [char]: updatedChar,
        },
      };
    });
  }, []);

  // Whole word failed or user gave up
  const onWholeWordMistake = useCallback((word: WordItem) => {
    setUserState(prev => {
      const existing = prev.wrongWords[word.id] || {
        id: word.id,
        word: word.word,
        pinyin: word.pinyin,
        pinyinArr: word.pinyinArr,
        explanation: word.explanation,
        grade: word.grade,
        mistakeCount: 0,
        practiceRoundsDone: 0,
        retestPassed: false,
        lastFailedAt: Date.now(),
      };

      const updatedWord: WrongWord = {
        ...existing,
        mistakeCount: existing.mistakeCount + 1,
        retestPassed: false,
        lastFailedAt: Date.now(),
      };

      // Also add each character into wrongChars
      const updatedWrongChars = { ...prev.wrongChars };
      word.chars.forEach((c, idx) => {
        const charPinyin = word.pinyinArr[idx] || '';
        const exChar = updatedWrongChars[c] || {
          char: c,
          pinyin: charPinyin,
          wordSource: word.word,
          mistakeCount: 0,
          practiceRoundsDone: 0,
          retestPassed: false,
          lastFailedAt: Date.now(),
        };
        updatedWrongChars[c] = {
          ...exChar,
          mistakeCount: exChar.mistakeCount + 1,
          lastFailedAt: Date.now(),
        };
      });

      return {
        ...prev,
        wrongWords: {
          ...prev.wrongWords,
          [word.id]: updatedWord,
        },
        wrongChars: updatedWrongChars,
      };
    });
  }, []);

  // Record practice rounds (e.g. 1/3, 2/3, 3/3 done)
  const updatePracticeProgress = useCallback((type: 'char' | 'word', key: string, rounds: number) => {
    setUserState(prev => {
      if (type === 'char') {
        const item = prev.wrongChars[key];
        if (!item) return prev;
        return {
          ...prev,
          wrongChars: {
            ...prev.wrongChars,
            [key]: {
              ...item,
              practiceRoundsDone: Math.max(item.practiceRoundsDone, rounds),
            },
          },
        };
      } else {
        const item = prev.wrongWords[key];
        if (!item) return prev;
        return {
          ...prev,
          wrongWords: {
            ...prev.wrongWords,
            [key]: {
              ...item,
              practiceRoundsDone: Math.max(item.practiceRoundsDone, rounds),
            },
          },
        };
      }
    });
  }, []);

  // Mark retest passed
  const markRetestSuccess = useCallback((type: 'char' | 'word', key: string) => {
    setUserState(prev => {
      if (type === 'char') {
        const item = prev.wrongChars[key];
        if (!item) return prev;
        return {
          ...prev,
          wrongChars: {
            ...prev.wrongChars,
            [key]: { ...item, retestPassed: true },
          },
        };
      } else {
        const item = prev.wrongWords[key];
        if (!item) return prev;
        return {
          ...prev,
          wrongWords: {
            ...prev.wrongWords,
            [key]: { ...item, retestPassed: true },
          },
        };
      }
    });
  }, []);

  const clearUserData = useCallback(() => {
    if (!user) return;
    const initial = getInitialUserState(user);
    setUserState(initial);
    saveUserState(initial);
  }, [user]);

  // Total unique characters in all vocabulary
  const totalCharactersCount = useMemo(() => {
    const set = new Set<string>();
    vocabularyData.forEach(item => {
      item.chars.forEach(c => set.add(c));
    });
    return set.size;
  }, []);

  const masteredCharactersCount = userState.masteredChars.length;
  const wrongWordsCount = Object.keys(userState.wrongWords).length;
  const wrongCharsCount = Object.keys(userState.wrongChars).length;

  const isCompletedAll = useMemo(() => {
    if (filteredWords.length === 0) return false;
    return filteredWords.every(item => userState.completedWordIds.includes(item.id));
  }, [filteredWords, userState.completedWordIds]);

  return (
    <LearningContext.Provider
      value={{
        allWords: vocabularyData,
        filteredWords,
        currentWord,
        currentIndex,
        totalInFilter: filteredWords.length,
        gradeFilter: userState.gradeFilter,
        setGradeFilter,
        userState,
        goToNextWord,
        goToPrevWord,
        jumpToWord,
        onWordCompleteSuccess,
        onSingleCharMistake,
        onWholeWordMistake,
        updatePracticeProgress,
        markRetestSuccess,
        clearUserData,
        totalCharactersCount,
        masteredCharactersCount,
        wrongWordsCount,
        wrongCharsCount,
        isCompletedAll,
      }}
    >
      {children}
    </LearningContext.Provider>
  );
}

export function useLearning() {
  const ctx = useContext(LearningContext);
  if (!ctx) throw new Error('useLearning must be used within a LearningProvider');
  return ctx;
}
