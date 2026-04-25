/**
 * User progress management with Firebase Firestore.
 * Uses Firestore as the single source of truth.
 */
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { type User } from 'firebase/auth';
import { getFirebaseDb } from './firebase';
import { type CardState, DEFAULT_CARD_STATE } from './sm2';

export interface UserProgress {
  cards: Record<string, CardState>;
  lastSession: number;
  totalSessionsCompleted: number;
  streak: number;
  lastStreakDate: string;
}

const DEFAULT_PROGRESS: UserProgress = {
  cards: {},
  lastSession: 0,
  totalSessionsCompleted: 0,
  streak: 0,
  lastStreakDate: '',
};

// ─── Firestore helpers ────────────────────────────────────────────────────────

function userProgressRef(userId: string) {
  const db = getFirebaseDb();
  return doc(db, 'users', userId, 'meta', 'progress');
}

function cardRef(userId: string, cardId: string) {
  const db = getFirebaseDb();
  return doc(db, 'users', userId, 'cards', cardId);
}

function cardsRef(userId: string) {
  const db = getFirebaseDb();
  return collection(db, 'users', userId, 'cards');
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function loadProgress(user: User | null): Promise<UserProgress> {
  if (!user) return DEFAULT_PROGRESS;

  try {
    const metaDoc = await getDoc(userProgressRef(user.uid));
    const cardsSnap = await getDocs(cardsRef(user.uid));

    const cards: Record<string, CardState> = {};
    cardsSnap.forEach((d) => {
      const data = d.data() as CardState;
      cards[d.id] = data;
    });

    const meta = metaDoc.exists() ? (metaDoc.data() as Omit<UserProgress, 'cards'>) : {};

    return {
      ...DEFAULT_PROGRESS,
      ...meta,
      cards,
    };
  } catch (error) {
    console.error('Error loading progress from Firestore:', error);
    return DEFAULT_PROGRESS;
  }
}

export async function saveCardState(
  user: User | null,
  cardId: string,
  state: CardState
): Promise<void> {
  if (!user) return;

  try {
    await setDoc(cardRef(user.uid, cardId), state);
  } catch (error) {
    console.error('Error saving card state:', error);
  }
}

export async function saveSessionMeta(
  user: User | null,
  meta: Partial<Omit<UserProgress, 'cards'>>
): Promise<void> {
  if (!user) return;

  try {
    await setDoc(userProgressRef(user.uid), { ...meta, updatedAt: serverTimestamp() }, { merge: true });
  } catch (error) {
    console.error('Error saving session meta:', error);
  }
}

export function getCardState(progress: UserProgress, cardId: string): CardState {
  const raw = progress.cards[cardId];
  if (!raw) return { ...DEFAULT_CARD_STATE, nextReview: Date.now() };
  return { ...raw, consecutiveEasy: raw.consecutiveEasy ?? 0 };
}

export function getProgressStats(progress: UserProgress, totalCards: number) {
  const states = Object.values(progress.cards);
  const now = Date.now();

  const due = states.filter((s) => s.nextReview <= now).length +
    (totalCards - states.length);

  const learned = states.filter((s) => s.repetitions > 0).length;
  const mastered = states.filter((s) =>
    (s.consecutiveEasy ?? 0) >= 3 && s.interval >= 30
  ).length;

  return {
    total: totalCards,
    due,
    learned,
    mastered,
    new: totalCards - states.length,
  };
}
