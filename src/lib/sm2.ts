/**
 * SM-2 Spaced Repetition Algorithm
 * Based on SuperMemo 2 algorithm by P.A. Wozniak
 *
 * Quality ratings:
 *   5 - Perfect response
 *   4 - Correct response after hesitation
 *   3 - Correct response with significant difficulty
 *   2 - Incorrect, but the correct answer seemed easy to recall
 *   1 - Incorrect, correct answer felt difficult
 *   0 - Blackout (complete failure)
 */

export interface CardState {
  easeFactor: number;   // starts at 2.5, min 1.3
  interval: number;     // review interval in days
  repetitions: number;  // number of successful reviews
  nextReview: number;   // timestamp (ms) for next review
  lastReview: number;   // timestamp (ms) of last review
  totalReviews: number; // all-time review count
}

export type Quality = 0 | 1 | 2 | 3 | 4 | 5;

export const DEFAULT_CARD_STATE: CardState = {
  easeFactor: 2.5,
  interval: 0,
  repetitions: 0,
  nextReview: Date.now(),
  lastReview: 0,
  totalReviews: 0,
};

/**
 * Update card state after a review.
 * Returns the new card state with updated scheduling.
 */
export function updateCardSM2(card: CardState, quality: Quality): CardState {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  const newEaseFactor = Math.max(
    1.3,
    card.easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  );

  if (quality < 3) {
    // Failed review — reset progression but keep ease factor adjustment
    return {
      ...card,
      easeFactor: newEaseFactor,
      repetitions: 0,
      interval: 1,
      nextReview: now + DAY,
      lastReview: now,
      totalReviews: card.totalReviews + 1,
    };
  }

  // Successful review
  let newInterval: number;
  if (card.repetitions === 0) {
    newInterval = 1;
  } else if (card.repetitions === 1) {
    newInterval = 6;
  } else {
    newInterval = Math.round(card.interval * newEaseFactor);
  }

  return {
    easeFactor: newEaseFactor,
    interval: newInterval,
    repetitions: card.repetitions + 1,
    nextReview: now + newInterval * DAY,
    lastReview: now,
    totalReviews: card.totalReviews + 1,
  };
}

/**
 * Check if a card is due for review.
 */
export function isCardDue(card: CardState): boolean {
  return Date.now() >= card.nextReview;
}

/**
 * Get a human-readable description of when the card will be reviewed next.
 */
export function getNextReviewLabel(card: CardState): string {
  const diff = card.nextReview - Date.now();
  const DAY = 24 * 60 * 60 * 1000;
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

/**
 * Get the "maturity" level label for a card.
 */
export function getCardMaturity(card: CardState): 'nova' | 'aprendendo' | 'revisando' | 'dominada' {
  if (card.repetitions === 0) return 'nova';
  if (card.repetitions <= 2) return 'aprendendo';
  if (card.interval <= 21) return 'revisando';
  return 'dominada';
}

/**
 * Convert an answer button click to a quality rating.
 * 'knew_it' = perfect answer → 5
 * 'hard' = knew it but with difficulty → 3
 * 'didnt_know' = didn't know → 1
 */
export function answerToQuality(answer: 'knew_it' | 'hard' | 'didnt_know'): Quality {
  switch (answer) {
    case 'knew_it': return 5;
    case 'hard': return 3;
    case 'didnt_know': return 1;
  }
}
