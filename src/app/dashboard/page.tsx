'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { useProgress } from '../../hooks/useProgress';
import { loadQuestions } from '../../lib/questions';
import { getProgressStats } from '../../lib/user-progress';
import type { Question } from '../../lib/questions';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, signOutUser } = useAuth();
  const { progress, loading: progressLoading } = useProgress(user);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');

  useEffect(() => {
    if (!authLoading && !user) router.replace('/');
  }, [authLoading, user, router]);

  useEffect(() => {
    loadQuestions().then(setQuestions);
  }, []);

  const stats = getProgressStats(progress, questions.length);

  const modules = Array.from(new Set(questions.map((q) => q.module))).sort();

  const handleStartStudy = () => {
    const params = new URLSearchParams();
    if (selectedModule !== 'all') params.set('module', selectedModule);
    if (selectedDifficulty !== 'all') params.set('difficulty', selectedDifficulty);
    router.push(`/study?${params.toString()}`);
  };

  const displayName = user?.displayName?.split(' ')[0] ?? 'Estudante';
  const loading = authLoading || progressLoading || !user;

  if (loading) {
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
        <div className="flex items-center gap-2">
          <span className="text-lg">🚗</span>
          <span className="font-black text-sm tracking-tight" style={{ color: '#f0f0f0' }}>CNH Quiz</span>
        </div>
        <div className="flex items-center gap-3">
          {user?.photoURL && (
            <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full" />
          )}
          <span className="text-sm font-medium" style={{ color: '#888' }}>{displayName}</span>
          <button
            onClick={signOutUser}
            className="text-xs px-3 py-1.5 rounded-lg border transition-all"
            style={{ color: '#555', borderColor: '#2a2a2a' }}
            onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.borderColor = '#555'}
            onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.borderColor = '#2a2a2a'}
          >
            Sair
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
        {/* Welcome + Streak */}
        <div className="flex items-start justify-between mb-6 animate-fade-in">
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#f0f0f0' }}>
              Olá, {displayName}!
            </h1>
            <p className="text-sm mt-0.5" style={{ color: '#555' }}>
              {stats.due > 0
                ? `${stats.due} card${stats.due > 1 ? 's' : ''} para revisar hoje`
                : 'Tudo em dia! Adicione novos cards.'}
            </p>
          </div>
          {progress.streak > 0 && (
            <div
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border"
              style={{ background: 'rgba(245, 216, 0, 0.1)', borderColor: 'rgba(245, 216, 0, 0.2)' }}
            >
              <span>🔥</span>
              <span className="font-bold text-sm" style={{ color: '#f5d800' }}>{progress.streak}</span>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6 animate-fade-in">
          <StatCard
            value={stats.due}
            label="Para revisar"
            color="#f5d800"
            icon="📋"
          />
          <StatCard
            value={stats.mastered}
            label="Dominadas"
            color="#22c55e"
            icon="✅"
          />
          <StatCard
            value={stats.learned}
            label="Aprendidas"
            color="#60a5fa"
            icon="📚"
          />
          <StatCard
            value={stats.total}
            label="Total"
            color="#888"
            icon="🗂️"
          />
        </div>

        {/* Progress Bar */}
        {stats.total > 0 && (
          <div
            className="rounded-2xl p-4 border mb-6 animate-fade-in"
            style={{ background: '#141414', borderColor: '#2a2a2a' }}
          >
            <div className="flex justify-between text-xs mb-2" style={{ color: '#555' }}>
              <span>Progresso geral</span>
              <span>{Math.round((stats.learned / stats.total) * 100)}%</span>
            </div>
            <div className="h-2 rounded-full" style={{ background: '#2a2a2a' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${(stats.learned / stats.total) * 100}%`,
                  background: 'linear-gradient(90deg, #f5d800, #22c55e)',
                }}
              />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <MiniStat label="Novas" value={stats.new} color="#888" />
              <MiniStat label="Aprendendo" value={stats.learned - stats.mastered} color="#f59e0b" />
              <MiniStat label="Dominadas" value={stats.mastered} color="#22c55e" />
            </div>
          </div>
        )}

        {/* Filters */}
        <div
          className="rounded-2xl p-4 border mb-4 animate-fade-in"
          style={{ background: '#141414', borderColor: '#2a2a2a' }}
        >
          <h3 className="text-sm font-semibold mb-3" style={{ color: '#f0f0f0' }}>
            Configurar sessão
          </h3>

          {/* Module Filter */}
          <div className="mb-3">
            <label className="text-xs mb-2 block" style={{ color: '#555' }}>Módulo</label>
            <div className="flex flex-wrap gap-2">
              <FilterChip
                label="Todos"
                active={selectedModule === 'all'}
                onClick={() => setSelectedModule('all')}
              />
              {modules.slice(0, 6).map((m) => (
                <FilterChip
                  key={m}
                  label={m.replace('MÓDULO ', 'M').split(' - ')[0]}
                  active={selectedModule === m}
                  onClick={() => setSelectedModule(m)}
                />
              ))}
            </div>
          </div>

          {/* Difficulty Filter */}
          <div>
            <label className="text-xs mb-2 block" style={{ color: '#555' }}>Dificuldade</label>
            <div className="flex gap-2">
              <FilterChip label="Todas" active={selectedDifficulty === 'all'} onClick={() => setSelectedDifficulty('all')} />
              <FilterChip label="Fácil" active={selectedDifficulty === 'easy'} onClick={() => setSelectedDifficulty('easy')} color="#22c55e" />
              <FilterChip label="Médio" active={selectedDifficulty === 'medium'} onClick={() => setSelectedDifficulty('medium')} color="#f59e0b" />
              <FilterChip label="Difícil" active={selectedDifficulty === 'hard'} onClick={() => setSelectedDifficulty('hard')} color="#ef4444" />
            </div>
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={handleStartStudy}
          disabled={stats.total === 0}
          className="w-full py-4 rounded-xl font-bold text-base transition-all duration-200 animate-fade-in"
          style={{
            background: stats.total > 0 ? '#f5d800' : '#1c1c1c',
            color: stats.total > 0 ? '#000' : '#555',
            cursor: stats.total === 0 ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={(e) => {
            if (stats.total > 0) (e.currentTarget as HTMLButtonElement).style.background = '#e6ca00';
          }}
          onMouseLeave={(e) => {
            if (stats.total > 0) (e.currentTarget as HTMLButtonElement).style.background = '#f5d800';
          }}
        >
          {loading
            ? 'Carregando...'
            : stats.total === 0
            ? 'Nenhuma questão disponível'
            : `Estudar${stats.due > 0 ? ` (${stats.due} pendentes)` : ''}`}
        </button>

        {stats.total === 0 && !loading && (
          <div
            className="mt-4 rounded-xl p-4 border text-center animate-fade-in"
            style={{ background: '#141414', borderColor: '#2a2a2a' }}
          >
            <p className="text-sm mb-2" style={{ color: '#888' }}>
              ⚠️ Nenhuma questão encontrada.
            </p>
            <p className="text-xs leading-relaxed" style={{ color: '#555' }}>
              Faça o arquivo <code className="text-yellow-400">banco nacional de questoes em markdown.md</code> ficar
              disponível offline no OneDrive (botão direito → &quot;Manter sempre neste dispositivo&quot;) e execute:{' '}
              <code className="text-yellow-400">python scripts/hydrate-file.py</code>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ value, label, color, icon }: { value: number; label: string; color: string; icon: string }) {
  return (
    <div
      className="rounded-xl p-4 border flex flex-col gap-1"
      style={{ background: '#141414', borderColor: '#2a2a2a' }}
    >
      <span className="text-lg">{icon}</span>
      <span className="text-2xl font-bold" style={{ color }}>{value}</span>
      <span className="text-xs" style={{ color: '#555' }}>{label}</span>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <div className="text-sm font-bold" style={{ color }}>{value}</div>
      <div className="text-xs" style={{ color: '#555' }}>{label}</div>
    </div>
  );
}

function FilterChip({ label, active, onClick, color }: { label: string; active: boolean; onClick: () => void; color?: string }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 border"
      style={{
        background: active ? (color ?? '#f5d800') + '20' : 'transparent',
        borderColor: active ? (color ?? '#f5d800') + '60' : '#2a2a2a',
        color: active ? (color ?? '#f5d800') : '#555',
      }}
    >
      {label}
    </button>
  );
}
