const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, '../../cnh/banco nacional de questoes em markdown.md');
const OUTPUT_FILE = path.join(__dirname, '../src/data/questions.json');

function parseMarkdown(content) {
  const questions = [];
  const lines = content.split('\n');

  let currentPart = '';
  let currentModule = '';
  let currentModuleNum = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    // Detect PARTE
    if (line.startsWith('## PARTE')) {
      currentPart = line.replace('## ', '').trim();
      i++;
      continue;
    }

    // Detect MÓDULO
    if (line.startsWith('### ')) {
      currentModule = line.replace('### ', '').trim();
      const moduleMatch = currentModule.match(/MÓDULO\s+(\d+)/i) || currentModule.match(/M.DULO\s+(\d+)/i);
      if (moduleMatch) {
        currentModuleNum = parseInt(moduleMatch[1]);
      }
      i++;
      continue;
    }

    // Detect question start: "l (Difficulty) NUMBER. question text"
    const questionStartMatch = line.match(/^l\s+\((F[aá]cil|Intermedi[aá]rio|Dif[ií]cil)\)\s+(\d+)\.\s+(.+)/i);
    if (questionStartMatch) {
      const difficulty = normalizeDifficulty(questionStartMatch[1]);
      const number = parseInt(questionStartMatch[2]);
      let questionText = questionStartMatch[3];

      // Collect multi-line question text (until we hit an empty line or "Alternativa")
      i++;
      while (i < lines.length) {
        const nextLine = lines[i].trim();
        if (
          nextLine === '' ||
          nextLine.startsWith('Alternativa correta:') ||
          nextLine.startsWith('Código da placa:') ||
          nextLine.startsWith('Respostas incorretas:')
        ) {
          break;
        }
        // Check if it's another question
        if (nextLine.match(/^l\s+\((F[aá]cil|Intermedi[aá]rio|Dif[ií]cil)\)\s+\d+\./i)) {
          break;
        }
        questionText += ' ' + nextLine;
        i++;
      }

      questionText = questionText.trim();

      // Skip blank lines and optional metadata
      let plateCode = '';
      while (i < lines.length && lines[i].trim() === '') i++;
      if (i < lines.length && lines[i].trim().startsWith('Código da placa:')) {
        plateCode = lines[i].trim().replace('Código da placa:', '').trim();
        i++;
      }
      while (i < lines.length && lines[i].trim() === '') i++;

      // Parse correct answer
      let correctAnswer = '';
      if (i < lines.length && lines[i].trim().startsWith('Alternativa correta:')) {
        correctAnswer = lines[i].trim()
          .replace('Alternativa correta:', '')
          .replace(/\s*3\s*$/, '')
          .trim();
        i++;

        // Collect multi-line correct answer
        while (i < lines.length) {
          const nextLine = lines[i].trim();
          if (
            nextLine === '' ||
            nextLine.startsWith('Comentário:') ||
            nextLine.startsWith('Respostas incorretas:')
          ) break;
          correctAnswer += ' ' + nextLine;
          i++;
        }
        correctAnswer = correctAnswer.trim();
      }
      while (i < lines.length && lines[i].trim() === '') i++;

      // Parse comment/explanation
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

      // Parse wrong answers
      const wrongAnswers = [];
      if (i < lines.length && lines[i].trim().startsWith('Respostas incorretas:')) {
        i++;
        while (i < lines.length) {
          const nextLine = lines[i].trim();
          if (nextLine === '') {
            i++;
            // Check if next non-empty line is another wrong answer
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
          } else if (nextLine.startsWith('l (') || nextLine.startsWith('## ') || nextLine.startsWith('### ')) {
            break;
          }
          i++;
        }
      }

      if (questionText && correctAnswer) {
        const allAnswers = [correctAnswer, ...wrongAnswers];
        questions.push({
          id: `${currentPart.replace(/\s+/g, '-').toLowerCase()}-m${currentModuleNum}-q${number}`,
          number,
          part: currentPart,
          module: currentModule,
          moduleNumber: currentModuleNum,
          difficulty,
          question: questionText,
          correctAnswer,
          wrongAnswers,
          allAnswers: shuffleArray(allAnswers),
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

// Main
const content = fs.readFileSync(INPUT_FILE, 'utf-8');
const questions = parseMarkdown(content);

// Ensure output directory exists
const outputDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(questions, null, 2), 'utf-8');

console.log(`✅ Parsed ${questions.length} questions`);

const byModule = questions.reduce((acc, q) => {
  const key = q.module || 'Unknown';
  acc[key] = (acc[key] || 0) + 1;
  return acc;
}, {});

console.log('\nQuestions by module:');
Object.entries(byModule).forEach(([mod, count]) => {
  console.log(`  ${mod}: ${count}`);
});
