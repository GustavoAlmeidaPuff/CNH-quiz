/**
 * User progress management with Firebase Firestore.
 * Falls back to localStorage when not authenticated.
 */
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  writeBatch,
  serverTimestamp,
  type DocumentData,
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

// ─── Local Storage fallback ──────────────────────────────────────────────────

const LS_KEY = 'cnh-quiz-progress';

function loadFromLocalStorage(): UserProgress {
  if (typeof window === 'undefined') return DEFAULT_PROGRESS;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    return JSON.parse(raw) as UserProgress;
  } catch {
    return DEFAULT_PROGRESS;
  }
}

function saveToLocalStorage(progress: UserProgress): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LS_KEY, JSON.stringify(progress));
}

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
  if (!user) return loadFromLocalStorage();

  try {
    const db = getFirebaseDb();
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
    return loadFromLocalStorage();
  }
}

export async function saveCardState(
  user: User | null,
  cardId: string,
  state: CardState
): Promise<void> {
  if (!user) {
    const progress = loadFromLocalStorage();
    progress.cards[cardId] = state;
    saveToLocalStorage(progress);
    return;
  }

  try {
    const db = getFirebaseDb();
    await setDoc(cardRef(user.uid, cardId), state);
  } catch (error) {
    console.error('Error saving card state:', error);
    // Fallback to localStorage
    const progress = loadFromLocalStorage();
    progress.cards[cardId] = state;
    saveToLocalStorage(progress);
  }
}

export async function saveSessionMeta(
  user: User | null,
  meta: Partial<Omit<UserProgress, 'cards'>>
): Promise<void> {
  if (!user) {
    const progress = loadFromLocalStorage();
    Object.assign(progress, meta);
    saveToLocalStorage(progress);
    return;
  }

  try {
    const db = getFirebaseDb();
    await setDoc(userProgressRef(user.uid), { ...meta, updatedAt: serverTimestamp() }, { merge: true });
  } catch (error) {
    console.error('Error saving session meta:', error);
  }
}

export function getCardState(progress: UserProgress, cardId: string): CardState {
  return progress.cards[cardId] ?? { ...DEFAULT_CARD_STATE, nextReview: Date.now() };
}

export function getProgressStats(progress: UserProgress, totalCards: number) {
  const states = Object.values(progress.cards);
  const now = Date.now();

  const due = states.filter((s) => s.nextReview <= now).length +
    (totalCards - states.length); // new cards are always due

  const learned = states.filter((s) => s.repetitions > 0).length;
  const mastered = states.filter((s) => s.interval >= 21 && s.repetitions > 0).length;

  return {
    total: totalCards,
    due,
    learned,
    mastered,
    new: totalCards - states.length,
  };
}
