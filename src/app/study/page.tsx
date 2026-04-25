'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { useProgress } from '../../hooks/useProgress';
import {
  loadQuestions,
  selectStudyCards,
  filterByDifficulty,
  filterByModule,
  type Question,
} from '../../lib/questions';
import { FlashCard } from '../../components/FlashCard';
import { SessionComplete } from '../../components/SessionComplete';

interface SessionStats {
  total: number;
  correct: number;
  hard: number;
  wrong: number;
  streak: number;
}

function StudyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { progress, loading: progressLoading, reviewCard, completeSession } = useProgress(user);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [studyQueue, setStudyQueue] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionStats, setSessionStats] = useState<SessionStats>({ total: 0, correct: 0, hard: 0, wrong: 0, streak: 0 });
  const [sessionDone, setSessionDone] = useState(false);
  const [loading, setLoading] = useState(true);

  const moduleFilter = searchParams.get('module') ?? 'all';
  const difficultyFilter = (searchParams.get('difficulty') ?? 'all') as 'all' | 'easy' | 'medium' | 'hard';

  useEffect(() => {
    if (!authLoading && !user) router.replace('/');
  }, [authLoading, user, router]);

  useEffect(() => {
    loadQuestions().then((qs) => {
      setQuestions(qs);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (authLoading || progressLoading || questions.length === 0) return;

    let filtered = filterByModule(questions, moduleFilter);
    filtered = filterByDifficulty(filtered, difficultyFilter);

    const cards = selectStudyCards(filtered, progress.cards, 20, 10);
    const queue = cards.map((c) => c.question);

    const nextQueue =
      queue.length === 0
        ? [...filtered].sort(() => Math.random() - 0.5).slice(0, 20)
        : queue;

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setStudyQueue(nextQueue);
    });

    return () => {
      cancelled = true;
    };
  }, [authLoading, progressLoading, questions, progress.cards, moduleFilter, difficultyFilter]);

  const handleAnswer = useCallback(
    async (quality: 1 | 3 | 5) => {
      const card = studyQueue[currentIndex];
      if (!card) return;

      await reviewCard(card.id, quality);

      setSessionStats((prev) => ({
        total: prev.total + 1,
        correct: quality >= 3 ? prev.correct + 1 : prev.correct,
        hard: quality === 3 ? prev.hard + 1 : prev.hard,
        wrong: quality === 1 ? prev.wrong + 1 : prev.wrong,
        streak: prev.streak,
      }));

      if (quality === 1) {
        // "Errei" → re-insert the card later in the queue
        const remaining = studyQueue.length - (currentIndex + 1);
        const offset = Math.min(5, remaining);
        const insertAt = currentIndex + 1 + offset;

        setStudyQueue((prev) => {
          const next = [...prev];
          next.splice(insertAt, 0, card);
          return next;
        });
        setCurrentIndex((i) => i + 1);
        return;
      }

      if (currentIndex + 1 >= studyQueue.length) {
        await completeSession();
        setSessionStats((prev) => ({ ...prev, streak: progress.streak + 1 }));
        setSessionDone(true);
      } else {
        setCurrentIndex((i) => i + 1);
      }
    },
    [studyQueue, currentIndex, reviewCard, completeSession, progress.streak]
  );

  if (loading || authLoading || progressLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0a' }}>
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: '#f5d800', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a0a0a' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b"
        style={{ background: 'rgba(10, 10, 10, 0.95)', borderColor: '#1c1c1c', backdropFilter: 'blur(8px)' }}
      >
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-sm transition-colors"
          style={{ color: '#555' }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#f0f0f0')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#555')}
        >
          ← Dashboard
        </button>
        <span className="text-sm font-semibold" style={{ color: '#f0f0f0' }}>
          {sessionDone ? 'Sessão concluída' : 'Estudando'}
        </span>
        <div className="w-20" />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-2xl mx-auto w-full">
        {sessionDone ? (
          <SessionComplete
            stats={sessionStats}
            onStudyMore={() => {
              setCurrentIndex(0);
              setSessionDone(false);
              setSessionStats({ total: 0, correct: 0, hard: 0, wrong: 0, streak: 0 });
              // Reshuffle queue
              const reshuffled = [...studyQueue].sort(() => Math.random() - 0.5);
              setStudyQueue(reshuffled);
            }}
            onGoHome={() => router.push('/dashboard')}
          />
        ) : studyQueue.length === 0 ? (
          <div className="text-center animate-fade-in">
            <div className="text-4xl mb-4">🎉</div>
            <h2 className="text-xl font-bold mb-2" style={{ color: '#f0f0f0' }}>
              Tudo em dia!
            </h2>
            <p className="text-sm mb-6" style={{ color: '#888' }}>
              Não há cards para revisar agora.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 rounded-xl font-bold text-sm"
              style={{ background: '#f5d800', color: '#000' }}
            >
              Voltar ao Dashboard
            </button>
          </div>
        ) : (
          <FlashCard
            key={`${studyQueue[currentIndex]?.id}-${currentIndex}`}
            question={studyQueue[currentIndex]}
            questionNumber={currentIndex + 1}
            totalQuestions={studyQueue.length}
            onAnswer={handleAnswer}
          />
        )}
      </main>
    </div>
  );
}

export default function StudyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0a' }}>
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: '#f5d800', borderTopColor: 'transparent' }}
          />
        </div>
      }
    >
      <StudyContent />
    </Suspense>
  );
}
