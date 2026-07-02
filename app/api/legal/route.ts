import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  if (type === 'terms') {
    const p = path.join(process.cwd(), '이용약관.md');
    return new NextResponse(fs.readFileSync(p, 'utf8'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  } else if (type === 'privacy') {
    const p = path.join(process.cwd(), '개인정보처리방침.md');
    return new NextResponse(fs.readFileSync(p, 'utf8'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }

  return new NextResponse('Not found', { status: 404 });
}
