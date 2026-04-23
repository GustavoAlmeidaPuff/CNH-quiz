'use client';

interface SessionStats {
  total: number;
  correct: number;
  hard: number;
  wrong: number;
  streak: number;
}

interface SessionCompleteProps {
  stats: SessionStats;
  onStudyMore: () => void;
  onGoHome: () => void;
}

export function SessionComplete({ stats, onStudyMore, onGoHome }: SessionCompleteProps) {
  const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-md mx-auto animate-slide-up text-center">
      {/* Trophy */}
      <div className="relative">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center text-5xl"
          style={{ background: 'rgba(245, 216, 0, 0.1)', border: '2px solid rgba(245, 216, 0, 0.3)' }}
        >
          {accuracy >= 80 ? '🏆' : accuracy >= 60 ? '⭐' : '📚'}
        </div>
        {stats.streak > 0 && (
          <div
            className="absolute -top-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: '#f5d800', color: '#000' }}
          >
            {stats.streak}🔥
          </div>
        )}
      </div>

      {/* Title */}
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold" style={{ color: '#f0f0f0' }}>
          Sessão concluída!
        </h2>
        <p className="text-sm" style={{ color: '#888' }}>
          {accuracy >= 80
            ? 'Excelente desempenho! Continue assim.'
            : accuracy >= 60
            ? 'Bom progresso! Continue praticando.'
            : 'Continue estudando. A prática leva à perfeição.'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 w-full">
        <StatCard value={stats.correct} label="Acertos" color="#22c55e" />
        <StatCard value={stats.hard} label="Difíceis" color="#f59e0b" />
        <StatCard value={stats.wrong} label="Erros" color="#ef4444" />
      </div>

      {/* Accuracy */}
      <div className="w-full rounded-2xl p-5 border" style={{ background: '#141414', borderColor: '#2a2a2a' }}>
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-medium" style={{ color: '#888' }}>Precisão</span>
          <span className="font-bold text-lg" style={{ color: accuracy >= 60 ? '#f5d800' : '#ef4444' }}>
            {accuracy}%
          </span>
        </div>
        <div className="h-2 rounded-full" style={{ background: '#2a2a2a' }}>
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${accuracy}%`,
              background: accuracy >= 60 ? '#f5d800' : '#ef4444',
            }}
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-col gap-3 w-full">
        <button
          onClick={onStudyMore}
          className="w-full py-4 rounded-xl font-bold text-sm transition-all duration-200"
          style={{ background: '#f5d800', color: '#000' }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#e6ca00')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#f5d800')}
        >
          Continuar Estudando
        </button>
        <button
          onClick={onGoHome}
          className="w-full py-4 rounded-xl font-bold text-sm transition-all duration-200 border"
          style={{ background: 'transparent', color: '#888', borderColor: '#2a2a2a' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = '#1c1c1c';
            (e.currentTarget as HTMLButtonElement).style.color = '#f0f0f0';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = '#888';
          }}
        >
          Ir para o Dashboard
        </button>
      </div>
    </div>
  );
}

function StatCard({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div
      className="flex flex-col items-center gap-1 rounded-xl p-4 border"
      style={{ background: '#141414', borderColor: '#2a2a2a' }}
    >
      <span className="text-2xl font-bold" style={{ color }}>
        {value}
      </span>
      <span className="text-xs" style={{ color: '#555' }}>
        {label}
      </span>
    </div>
  );
}
