'use client';

import { useState, useEffect, useCallback } from 'react';
import type { User } from 'firebase/auth';
import {
  loadProgress,
  saveCardState,
  saveSessionMeta,
  getCardState,
  type UserProgress,
} from '../lib/user-progress';
import { updateCardSM2, type CardState, type Quality } from '../lib/sm2';

export function useProgress(user: User | null) {
  const [progress, setProgress] = useState<UserProgress>({
    cards: {},
    lastSession: 0,
    totalSessionsCompleted: 0,
    streak: 0,
    lastStreakDate: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    loadProgress(user).then((p) => {
      setProgress(p);
      setLoading(false);
    });
  }, [user]);

  const reviewCard = useCallback(
    async (cardId: string, quality: Quality) => {
      const currentState = getCardState(progress, cardId);
      const newState = updateCardSM2(currentState, quality);

      setProgress((prev) => ({
        ...prev,
        cards: { ...prev.cards, [cardId]: newState },
      }));

      await saveCardState(user, cardId, newState);
    },
    [progress, user]
  );

  const completeSession = useCallback(
    async (cardsReviewed: number) => {
      const today = new Date().toISOString().split('T')[0];
      const lastDate = progress.lastStreakDate;
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      let newStreak = progress.streak;
      if (lastDate === today) {
        // Already studied today, keep streak
      } else if (lastDate === yesterday) {
        newStreak += 1;
      } else {
        newStreak = 1;
      }

      const meta = {
        lastSession: Date.now(),
        totalSessionsCompleted: progress.totalSessionsCompleted + 1,
        streak: newStreak,
        lastStreakDate: today,
      };

      setProgress((prev) => ({ ...prev, ...meta }));
      await saveSessionMeta(user, meta);
    },
    [progress, user]
  );

  return { progress, loading, reviewCard, completeSession };
}
