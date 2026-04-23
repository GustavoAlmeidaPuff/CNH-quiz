'use client';

import { useState, useCallback } from 'react';
import type { Question } from '../lib/questions';
import { shuffleAnswers } from '../lib/questions';

interface FlashCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (quality: 1 | 3 | 5) => void;
}

export function FlashCard({ question, questionNumber, totalQuestions, onAnswer }: FlashCardProps) {
  const [revealed, setRevealed] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answers] = useState(() => shuffleAnswers(question));

  const handleReveal = useCallback((answer: string) => {
    if (revealed) return;
    setSelectedAnswer(answer);
    setRevealed(true);
  }, [revealed]);

  const isCorrect = selectedAnswer === question.correctAnswer;

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto animate-slide-up">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full" style={{ background: '#1c1c1c' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              background: '#f5d800',
              width: `${((questionNumber) / totalQuestions) * 100}%`,
            }}
          />
        </div>
        <span className="text-xs font-mono" style={{ color: '#888' }}>
          {questionNumber}/{totalQuestions}
        </span>
      </div>

      {/* Difficulty Badge */}
      <div className="flex items-center gap-2">
        <DifficultyBadge difficulty={question.difficulty} />
        {question.moduleNumber > 0 && (
          <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#1c1c1c', color: '#888' }}>
            Módulo {question.moduleNumber}
          </span>
        )}
      </div>

      {/* Question Card */}
      <div
        className="rounded-2xl p-6 border"
        style={{
          background: '#141414',
          borderColor: '#2a2a2a',
        }}
      >
        {question.plateCode && (
          <div
            className="inline-block text-xs font-mono px-2 py-1 rounded mb-3"
            style={{ background: '#1c1c1c', color: '#f5d800' }}
          >
            Placa: {question.plateCode}
          </div>
        )}
        <p className="text-lg font-medium leading-relaxed" style={{ color: '#f0f0f0' }}>
          {question.question}
        </p>
      </div>

      {/* Answer Options */}
      <div className="flex flex-col gap-3">
        {answers.map((answer, i) => (
          <button
            key={i}
            onClick={() => handleReveal(answer)}
            disabled={revealed}
            className="text-left rounded-xl px-5 py-4 transition-all duration-200 border text-sm font-medium"
            style={getAnswerStyle(answer, selectedAnswer, question.correctAnswer, revealed)}
          >
            <span className="mr-3 opacity-50 font-mono text-xs">
              {String.fromCharCode(65 + i)}
            </span>
            {answer}
          </button>
        ))}
      </div>

      {/* Feedback & SM-2 Buttons */}
      {revealed && (
        <div className="animate-fade-in flex flex-col gap-4">
          {/* Result */}
          <div
            className="rounded-xl p-4 border"
            style={{
              background: isCorrect ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              borderColor: isCorrect ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="font-bold text-sm" style={{ color: isCorrect ? '#22c55e' : '#ef4444' }}>
                {isCorrect ? '✓ Correto!' : '✗ Incorreto'}
              </span>
              {!isCorrect && (
                <span className="text-xs" style={{ color: '#888' }}>
                  Resposta correta:
                </span>
              )}
            </div>
            {!isCorrect && (
              <p className="text-sm mb-2" style={{ color: '#f0f0f0' }}>
                {question.correctAnswer}
              </p>
            )}
            {question.comment && (
              <p className="text-xs leading-relaxed" style={{ color: '#888' }}>
                {question.comment}
              </p>
            )}
          </div>

          {/* SM-2 Rating Buttons */}
          <div className="flex flex-col gap-2">
            <p className="text-xs text-center" style={{ color: '#555' }}>
              Como você avalia seu desempenho?
            </p>
            <div className="grid grid-cols-3 gap-3">
              <RatingButton
                onClick={() => onAnswer(1)}
                label="Não sabia"
                sublabel="Verei em breve"
                color="#ef4444"
                bgColor="rgba(239, 68, 68, 0.1)"
              />
              <RatingButton
                onClick={() => onAnswer(3)}
                label="Difícil"
                sublabel="Com dificuldade"
                color="#f59e0b"
                bgColor="rgba(245, 158, 11, 0.1)"
              />
              <RatingButton
                onClick={() => onAnswer(5)}
                label="Sabia!"
                sublabel="Sem dificuldade"
                color="#22c55e"
                bgColor="rgba(34, 197, 94, 0.1)"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getAnswerStyle(
  answer: string,
  selected: string | null,
  correct: string,
  revealed: boolean
): React.CSSProperties {
  if (!revealed) {
    return {
      background: '#141414',
      borderColor: '#2a2a2a',
      color: '#f0f0f0',
      cursor: 'pointer',
    };
  }

  if (answer === correct) {
    return {
      background: 'rgba(34, 197, 94, 0.15)',
      borderColor: 'rgba(34, 197, 94, 0.5)',
      color: '#22c55e',
      cursor: 'default',
    };
  }

  if (answer === selected) {
    return {
      background: 'rgba(239, 68, 68, 0.15)',
      borderColor: 'rgba(239, 68, 68, 0.5)',
      color: '#ef4444',
      cursor: 'default',
    };
  }

  return {
    background: '#141414',
    borderColor: '#1c1c1c',
    color: '#555',
    cursor: 'default',
  };
}

function DifficultyBadge({ difficulty }: { difficulty: Question['difficulty'] }) {
  const map = {
    easy: { label: 'Fácil', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' },
    medium: { label: 'Intermediário', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
    hard: { label: 'Difícil', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
  };
  const { label, color, bg } = map[difficulty];
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ color, background: bg }}>
      {label}
    </span>
  );
}

interface RatingButtonProps {
  onClick: () => void;
  label: string;
  sublabel: string;
  color: string;
  bgColor: string;
}

function RatingButton({ onClick, label, sublabel, color, bgColor }: RatingButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 rounded-xl py-3 px-2 transition-all duration-150 border text-center"
      style={{
        background: bgColor,
        borderColor: `${color}40`,
        color,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = color;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = `${color}40`;
      }}
    >
      <span className="font-bold text-sm">{label}</span>
      <span className="text-xs opacity-70">{sublabel}</span>
    </button>
  );
}
