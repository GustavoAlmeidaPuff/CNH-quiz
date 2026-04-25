import { DEFAULT_CARD_STATE, type CardState } from './sm2';

export interface Question {
  id: string;
  number: number;
  part: string;
  module: string;
  moduleNumber: number;
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  correctAnswer: string;
  wrongAnswers: string[];
  allAnswers: string[];
  comment: string;
  plateCode: string | null;
}

export interface StudyCard {
  question: Question;
  state: CardState;
  isNew: boolean;
}

let _questions: Question[] | null = null;

export async function loadQuestions(): Promise<Question[]> {
  if (_questions) return _questions;

  try {
    const res = await fetch('/api/questions');
    if (!res.ok) throw new Error('Failed to load questions');
    _questions = await res.json();
    return _questions!;
  } catch {
    // Fallback to static import for SSR
    const data = await import('../data/questions.json');
    _questions = data.default as Question[];
    return _questions;
  }
}

export function getModules(questions: Question[]): string[] {
  const modules = new Set(questions.map((q) => q.module));
  return Array.from(modules).sort();
}

export function filterByDifficulty(
  questions: Question[],
  difficulty: 'easy' | 'medium' | 'hard' | 'all'
): Question[] {
  if (difficulty === 'all') return questions;
  return questions.filter((q) => q.difficulty === difficulty);
}

export function filterByModule(questions: Question[], module: string): Question[] {
  if (module === 'all') return questions;
  return questions.filter((q) => q.module === module);
}

/**
 * Select cards for a study session using SM-2 priorities:
 * 1. Due cards (overdue first)
 * 2. New cards (up to the daily new card limit)
 */
export function selectStudyCards(
  questions: Question[],
  cardStates: Record<string, CardState>,
  maxCards = 20,
  maxNewCards = 10
): StudyCard[] {
  const now = Date.now();

  const dueCards: StudyCard[] = [];
  const newCards: StudyCard[] = [];

  for (const q of questions) {
    const state = cardStates[q.id];

    if (!state) {
      newCards.push({ question: q, state: { ...DEFAULT_CARD_STATE, nextReview: now }, isNew: true });
    } else if (state.nextReview <= now) {
      dueCards.push({ question: q, state, isNew: false });
    }
  }

  // Sort due cards: most overdue first
  dueCards.sort((a, b) => a.state.nextReview - b.state.nextReview);

  // Limit new cards
  const limitedNewCards = newCards.slice(0, maxNewCards);

  // Combine and limit total
  const combined = [...dueCards, ...limitedNewCards].slice(0, maxCards);

  return combined;
}

export function shuffleAnswers(question: Question): string[] {
  const answers = [question.correctAnswer, ...question.wrongAnswers];
  for (let i = answers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [answers[i], answers[j]] = [answers[j], answers[i]];
  }
  return answers;
}

export const DIFFICULTY_LABELS: Record<Question['difficulty'], string> = {
  easy: 'Fácil',
  medium: 'Intermediário',
  hard: 'Difícil',
};

export const DIFFICULTY_COLORS: Record<Question['difficulty'], string> = {
  easy: '#22c55e',
  medium: '#f59e0b',
  hard: '#ef4444',
};
