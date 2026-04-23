/**
 * Script to parse CNH questions from markdown to JSON.
 *
 * USAGE:
 *   node scripts/parse-questions.js
 *
 * PREREQUISITE:
 *   The source markdown file must be locally available.
 *   If it's a OneDrive cloud-only file, right-click it in Explorer
 *   and choose "Keep always on this device" before running this script.
 *
 *   Alternatively, run: python scripts/hydrate-file.py
 */

const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(
  __dirname,
  '..',
  '..',
  'cnh',
  'banco nacional de questoes em markdown.md'
);
const OUTPUT_FILE = path.join(__dirname, '..', 'src', 'data', 'questions.json');

function parseMarkdown(content) {
  const questions = [];
  const lines = content.split('\n');

  let currentPart = '';
  let currentModule = '';
  let currentModuleNum = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (line.startsWith('## PARTE')) {
      currentPart = line.replace('## ', '').trim();
      i++;
      continue;
    }

    if (line.startsWith('### ')) {
      currentModule = line.replace('### ', '').trim();
      const moduleMatch =
        currentModule.match(/M[ÓO]DULO\s+(\d+)/i) ||
        currentModule.match(/M.DULO\s+(\d+)/i);
      if (moduleMatch) currentModuleNum = parseInt(moduleMatch[1]);
      i++;
      continue;
    }

    const questionStartMatch = line.match(
      /^l\s+\((F[aá]cil|Intermedi[aá]rio|Dif[ií]cil)\)\s+(\d+)\.\s+(.+)/i
    );
    if (questionStartMatch) {
      const difficulty = normalizeDifficulty(questionStartMatch[1]);
      const number = parseInt(questionStartMatch[2]);
      let questionText = questionStartMatch[3];

      i++;
      while (i < lines.length) {
        const nextLine = lines[i].trim();
        if (
          nextLine === '' ||
          nextLine.startsWith('Alternativa correta:') ||
          nextLine.startsWith('Código da placa:') ||
          nextLine.startsWith('Respostas incorretas:')
        ) break;
        if (nextLine.match(/^l\s+\((F[aá]cil|Intermedi[aá]rio|Dif[ií]cil)\)\s+\d+\./i)) break;
        questionText += ' ' + nextLine;
        i++;
      }
      questionText = questionText.trim();

      let plateCode = '';
      while (i < lines.length && lines[i].trim() === '') i++;
      if (i < lines.length && lines[i].trim().startsWith('Código da placa:')) {
        plateCode = lines[i].trim().replace('Código da placa:', '').trim();
        i++;
      }
      while (i < lines.length && lines[i].trim() === '') i++;

      let correctAnswer = '';
      if (i < lines.length && lines[i].trim().startsWith('Alternativa correta:')) {
        correctAnswer = lines[i]
          .trim()
          .replace('Alternativa correta:', '')
          .replace(/\s*3\s*$/, '')
          .trim();
        i++;
        while (i < lines.length) {
          const nextLine = lines[i].trim();
          if (nextLine === '' || nextLine.startsWith('Comentário:') || nextLine.startsWith('Respostas incorretas:')) break;
          correctAnswer += ' ' + nextLine;
          i++;
        }
        correctAnswer = correctAnswer.trim();
      }
      while (i < lines.length && lines[i].trim() === '') i++;

      let comment = '';
      if (i < lines.length && lines[i].trim().startsWith('Comentário:')) {
        comment = lines[i].trim().replace('Comentário:', '').trim();
        i++;
        while (i < lines.length) {
          const nextLine = lines[i].trim();
          if (nextLine === '' || nextLine.startsWith('Respostas incorretas:')) break;
          comment += ' ' + nextLine;
          i++;
        }
        comment = comment.trim();
      }
      while (i < lines.length && lines[i].trim() === '') i++;

      const wrongAnswers = [];
      if (i < lines.length && lines[i].trim().startsWith('Respostas incorretas:')) {
        i++;
        while (i < lines.length) {
          const nextLine = lines[i].trim();
          if (nextLine === '') {
            i++;
            let j = i;
            while (j < lines.length && lines[j].trim() === '') j++;
            if (j < lines.length && lines[j].trim().startsWith('7 ')) {
              i = j;
              continue;
            }
            break;
          }
          if (nextLine.startsWith('7 ')) {
            wrongAnswers.push(nextLine.replace(/^7\s+/, '').trim());
          } else if (
            nextLine.match(/^l\s+\(/) ||
            nextLine.startsWith('## ') ||
            nextLine.startsWith('### ')
          ) {
            break;
          }
          i++;
        }
      }

      if (questionText && correctAnswer) {
        const allAnswers = shuffleArray([correctAnswer, ...wrongAnswers]);
        const partSlug = currentPart.replace(/\s+/g, '-').toLowerCase();
        questions.push({
          id: `${partSlug}-m${currentModuleNum}-q${number}`,
          number,
          part: currentPart,
          module: currentModule,
          moduleNumber: currentModuleNum,
          difficulty,
          question: questionText,
          correctAnswer,
          wrongAnswers,
          allAnswers,
          comment,
          plateCode: plateCode || null,
        });
      }
      continue;
    }

    i++;
  }

  return questions;
}

function normalizeDifficulty(raw) {
  const lower = raw.toLowerCase();
  if (lower.includes('fácil') || lower.includes('facil')) return 'easy';
  if (lower.includes('intermediário') || lower.includes('intermediario')) return 'medium';
  if (lower.includes('difícil') || lower.includes('dificil')) return 'hard';
  return 'medium';
}

function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ─── Main ────────────────────────────────────────────────────────────────────

if (!fs.existsSync(INPUT_FILE)) {
  console.error(`❌ File not found: ${INPUT_FILE}`);
  console.error('\nMake sure the OneDrive file is available offline.');
  process.exit(1);
}

const stat = fs.statSync(INPUT_FILE);
if (stat.size === 0) {
  console.error(`❌ File is empty (OneDrive cloud-only file not synced): ${INPUT_FILE}`);
  console.error('\nTo fix: right-click the file in Explorer → "Keep always on this device"');
  console.error('Or run: python scripts/hydrate-file.py');
  process.exit(1);
}

const content = fs.readFileSync(INPUT_FILE, 'utf-8');
const questions = parseMarkdown(content);

const outputDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(questions, null, 2), 'utf-8');
console.log(`✅ Parsed ${questions.length} questions → ${OUTPUT_FILE}`);

const byModule = questions.reduce((acc, q) => {
  const key = q.module || 'Unknown';
  acc[key] = (acc[key] || 0) + 1;
  return acc;
}, {});

console.log('\nQuestions by module:');
Object.entries(byModule).forEach(([mod, count]) => {
  console.log(`  ${mod}: ${count}`);
});
