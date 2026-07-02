import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { PDFDocument } from 'pdf-lib';


export async function POST(req: NextRequest) {
  // 개발 환경 프록시/MITM 인증서 이슈 우회
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const pageRange = formData.get('pageRange') as string;
    
    if (!file || !pageRange) {
      return NextResponse.json({ error: '파일과 페이지 범위를 모두 입력해주세요.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    let finalBuffer = buffer;
    try {
      const match = pageRange.match(/(\d+)\s*[-~]\s*(\d+)/);
      if (match) {
        const startPage = Math.max(1, parseInt(match[1], 10)) - 1;
        const endPage = Math.max(startPage, parseInt(match[2], 10)) - 1;
        
        const pdfDoc = await PDFDocument.load(buffer);
        const totalPages = pdfDoc.getPageCount();
        const validEndPage = Math.min(endPage, totalPages - 1);
        
        const pagesToCopy = [];
        for (let i = startPage; i <= validEndPage; i++) {
          pagesToCopy.push(i);
        }
        
        if (pagesToCopy.length > 0) {
          const newPdfDoc = await PDFDocument.create();
          const copiedPages = await newPdfDoc.copyPages(pdfDoc, pagesToCopy);
          copiedPages.forEach((page) => newPdfDoc.addPage(page));
          const newPdfBytes = await newPdfDoc.save();
          finalBuffer = Buffer.from(newPdfBytes);
        }
      } else {
        // 단일 페이지 입력인 경우 (예: "15")
        const singlePage = parseInt(pageRange.trim(), 10);
        if (!isNaN(singlePage)) {
          const pageIdx = Math.max(1, singlePage) - 1;
          const pdfDoc = await PDFDocument.load(buffer);
          if (pageIdx < pdfDoc.getPageCount()) {
            const newPdfDoc = await PDFDocument.create();
            const copiedPages = await newPdfDoc.copyPages(pdfDoc, [pageIdx]);
            copiedPages.forEach((page) => newPdfDoc.addPage(page));
            const newPdfBytes = await newPdfDoc.save();
            finalBuffer = Buffer.from(newPdfBytes);
          }
        }
      }
    } catch (e) {
      console.error("PDF 분할 중 오류 발생, 원본 파일로 계속 진행합니다.", e);
    }
    
    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
    
    const prompt = `
당신은 중학교 교과서 분석 AI 튜터입니다.
첨부된 교과서 PDF 문서 전체를 꼼꼼하게 처음부터 끝까지 빠짐없이 모두 읽고, 이를 바탕으로 3단계 학습 콘텐츠를 생성해주세요.
표나 다단 등 복잡한 문서 구조도 시각적으로 잘 분석하여 전체 페이지의 흐름에 맞게 텍스트를 추출해야 합니다.

중요 규칙:
1. step1_text_list에 들어갈 텍스트는 짧은 한두 문장으로 쪼개지 마세요.
2. 학생들이 전체 문맥을 파악하며 타자 연습을 할 수 있도록 논리적으로 완결된 온전하고 긴 문단 단위(최소 150자~300자 이상)로 추출해주세요.
3. 추출된 문단 텍스트 안에는 절대 줄바꿈 기호(\n)가 들어가면 안 됩니다. 문장이 나뉠 때는 띄어쓰기로 이어주세요.

반드시 아래 JSON 형식으로만 응답해야 합니다. 다른 말은 덧붙이지 마세요.

{
  "step1_text_list": [
    "문단 1의 전체 문장 (본문 내용 중 중요 문단을 원문 그대로 추출하여, 학생들이 전체 문맥을 읽고 타자를 칠 수 있게 깁니다)",
    "문단 2의 전체 문장"
  ],
  "step2_keywords_list": [
    { 
      "keyword": "핵심단어1", 
      "description": "본문의 핵심 문장과 '핵심단어1'에 대한 설명을 자연스러운 하나의 완전한 문장으로 합쳐서 작성 (예: 광합성은 식물이 빛에너지를 이용하여 양분을 만드는 과정입니다.)" 
    },
    { 
      "keyword": "핵심단어2", 
      "description": "핵심단어2에 대한 설명이 포함된 완전한 문장" 
    }
  ],
  "step3_quiz_list": [
    {
      "type": "multiple_choice",
      "question": "2단계(step2)에서 만든 설명 문장에서 핵심 단어 부분을 빈칸([   ])으로 뚫어 만든 퀴즈 문제 (예: [   ]은 식물이 빛에너지를 이용하여 양분을 만드는 과정입니다.)",
      "options": ["오답1", "핵심단어1", "오답2", "오답3"],
      "answer": 2,
      "explanation": "이 빈칸에 들어갈 알맞은 단어는 '핵심단어1'입니다. (간단한 추가 해설)"
    }
  ]
}
`;

    const responseStream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: [
            { role: 'user', parts: [
              { text: prompt },
              { inlineData: { mimeType: "application/pdf", data: finalBuffer.toString('base64') } }
            ] }
        ],
        config: {
            responseMimeType: "application/json"
        }
    });

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of responseStream) {
            if (chunk.text) {
              controller.enqueue(new TextEncoder().encode(chunk.text));
            }
          }
        } catch (e: any) {
          console.error('스트리밍 중 에러:', e);
          controller.error(e);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, { headers: { 'Content-Type': 'text/plain' } });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'AI 분석 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
