import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-static';

export function GET() {
  try {
    const filePath = join(process.cwd(), 'src', 'data', 'questions.json');
    const content = readFileSync(filePath, 'utf-8');
    const questions = JSON.parse(content);
    return NextResponse.json(questions, {
      headers: { 'Cache-Control': 'public, max-age=3600' },
    });
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
