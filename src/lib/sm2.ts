/**
 * Anki-style Spaced Repetition Algorithm (based on SM-2)
 *
 * Three response buttons:
 *   1 - "Errei/Não sabia"  → re-shown in the SAME session
 *   3 - "Difícil"           → scheduled for NEXT session (~1 day)
 *   5 - "Sabia!"            → interval grows; 2+ consecutive → graduated
 */

export interface CardState {
  easeFactor: number;      // starts at 2.5, min 1.3
  interval: number;        // review interval in days (0 = same session)
  repetitions: number;     // number of successful reviews in a row
  consecutiveEasy: number; // consecutive "Sabia!" answers (for graduation)
  nextReview: number;      // timestamp (ms) for next review
  lastReview: number;      // timestamp (ms) of last review
  totalReviews: number;    // all-time review count
}

export type Quality = 0 | 1 | 2 | 3 | 4 | 5;

const DAY = 24 * 60 * 60 * 1000;
const MAX_INTERVAL = 365;

export const DEFAULT_CARD_STATE: CardState = {
  easeFactor: 2.5,
  interval: 0,
  repetitions: 0,
  consecutiveEasy: 0,
  nextReview: Date.now(),
  lastReview: 0,
  totalReviews: 0,
};

/**
 * Update card state after a review using Anki-inspired scheduling.
 *
 * - quality=1 ("Errei"):   nextReview=now, interval=0 → re-queue in same session
 * - quality=3 ("Difícil"): interval=1 day → shows up next session
 * - quality=5 ("Sabia!"):  interval grows exponentially; consecutive "Sabia" accelerates graduation
 */
export function updateCardSM2(card: CardState, quality: Quality): CardState {
  const now = Date.now();

  if (quality <= 1) {
    return handleFailed(card, now);
  }
  if (quality <= 3) {
    return handleHard(card, now);
  }
  return handleEasy(card, now);
}

function handleFailed(card: CardState, now: number): CardState {
  const newEF = adjustEaseFactor(card.easeFactor, 1);
  return {
    easeFactor: newEF,
    interval: 0,
    repetitions: 0,
    consecutiveEasy: 0,
    nextReview: now,
    lastReview: now,
    totalReviews: card.totalReviews + 1,
  };
}

function handleHard(card: CardState, now: number): CardState {
  const newEF = adjustEaseFactor(card.easeFactor, 3);
  return {
    easeFactor: newEF,
    interval: 1,
    repetitions: card.repetitions > 0 ? card.repetitions : 1,
    consecutiveEasy: 0,
    nextReview: now + DAY,
    lastReview: now,
    totalReviews: card.totalReviews + 1,
  };
}

function handleEasy(card: CardState, now: number): CardState {
  const newEF = adjustEaseFactor(card.easeFactor, 5);
  const newConsecutive = card.consecutiveEasy + 1;
  const newReps = card.repetitions + 1;

  let newInterval: number;
  if (newReps === 1) {
    newInterval = 3;
  } else if (newReps === 2) {
    newInterval = 7;
  } else {
    newInterval = Math.round(card.interval * newEF);
  }

  if (newConsecutive >= 3) {
    newInterval = Math.max(newInterval, 60);
  } else if (newConsecutive === 2) {
    newInterval = Math.max(newInterval, 21);
  }

  newInterval = Math.min(newInterval, MAX_INTERVAL);

  return {
    easeFactor: newEF,
    interval: newInterval,
    repetitions: newReps,
    consecutiveEasy: newConsecutive,
    nextReview: now + newInterval * DAY,
    lastReview: now,
    totalReviews: card.totalReviews + 1,
  };
}

function adjustEaseFactor(ef: number, quality: Quality): number {
  return Math.max(
    1.3,
    ef + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  );
}

export function isCardDue(card: CardState): boolean {
  return Date.now() >= card.nextReview;
}

/**
 * Whether this card was marked "errei" and needs to be re-shown in the same session.
 * interval=0 signals in-session relearning.
 */
export function needsInSessionRetry(card: CardState): boolean {
  return card.interval === 0 && card.totalReviews > 0;
}

export function getNextReviewLabel(card: CardState): string {
  if (card.interval === 0 && card.totalReviews > 0) return 'Agora (mesma sessão)';

  const diff = card.nextReview - Date.now();
  const HOUR = 60 * 60 * 1000;

  if (diff <= 0) return 'Agora';
  if (diff < HOUR) {
    const mins = Math.round(diff / 60000);
    return `Em ${mins} min`;
  }
  if (diff < DAY) {
    const hours = Math.round(diff / HOUR);
    return `Em ${hours}h`;
  }
  const days = Math.round(diff / DAY);
  if (days === 1) return 'Amanhã';
  return `Em ${days} dias`;
}

export function getCardMaturity(card: CardState): 'nova' | 'aprendendo' | 'revisando' | 'dominada' {
  if (card.repetitions === 0) return 'nova';
  if (card.consecutiveEasy >= 3 && card.interval >= 30) return 'dominada';
  if (card.interval >= 21) return 'revisando';
  return 'aprendendo';
}

export function answerToQuality(answer: 'knew_it' | 'hard' | 'didnt_know'): Quality {
  switch (answer) {
    case 'knew_it': return 5;
    case 'hard': return 3;
    case 'didnt_know': return 1;
  }
}
