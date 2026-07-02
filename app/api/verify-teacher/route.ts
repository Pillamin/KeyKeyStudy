import { NextResponse } from 'next/server';

// IP 기반 Rate Limiting을 위한 간단한 메모리 스토어 (Vercel 환경에서도 단일 지역 인스턴스 범위 내에서 제한적 동작)
const rateLimitStore = new Map<string, { count: number; lockedUntil: number }>();

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    
    // Rate limit 체크
    const now = Date.now();
    const record = rateLimitStore.get(ip);
    
    if (record && record.lockedUntil > now) {
      const waitMinutes = Math.ceil((record.lockedUntil - now) / 60000);
      return NextResponse.json(
        { success: false, message: `시도 횟수를 초과했습니다. ${waitMinutes}분 후에 다시 시도해 주세요.` },
        { status: 429 }
      );
    }
    
    const body = await req.json();
    const { code } = body;
    const correctCode = process.env.TEACHER_CODE;

    if (!code || code !== correctCode) {
      // 실패 횟수 증가
      const newCount = (record?.count || 0) + 1;
      let lockedUntil = 0;
      
      if (newCount >= 5) {
        // 5회 실패 시 5분 락
        lockedUntil = now + 5 * 60 * 1000;
      }
      
      rateLimitStore.set(ip, { count: newCount, lockedUntil });

      return NextResponse.json(
        { success: false, message: '올바른 인증 코드가 아닙니다.' },
        { status: 400 }
      );
    }
    
    // 성공 시 기록 초기화
    rateLimitStore.delete(ip);
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Verify teacher error:', error);
    return NextResponse.json({ success: false, message: '서버 에러' }, { status: 500 });
  }
}
