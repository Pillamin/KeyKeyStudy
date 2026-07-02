import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: NextRequest) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  try {
    const body = await req.json();
    const { messages, contentContext } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: '메시지가 필요합니다.' }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
    
    let contextPrompt = `당신은 학생들을 친절하게 가르치는 AI 학습 튜터입니다. 학생이 단원 종합 퀴즈를 풀면서 어려워하거나 질문하는 내용에 대해 답변해주세요. 정답을 바로 알려주기보다는 힌트를 주어 스스로 생각하게 유도하는 것이 좋습니다.
[중요 규칙]
- 현재 학습 중인 수업 내용(단원, 문제 등)과 전혀 관련이 없는 엉뚱한 질문이나 잡담을 할 경우, 부드럽지만 단호하게 "이 질문은 현재 수업 내용과 관련이 없어요. 학습과 관련된 질문을 해주세요!" 라고 대답하며 차단해야 합니다.`;
    
    if (contentContext) {
      contextPrompt += `\n\n현재 학습 중인 단원: ${contentContext.unit} - ${contentContext.title}\n현재 문제: ${contentContext.question}\n선택지: ${contentContext.options.join(', ')}`;
    }

    // Convert messages for Gemini
    // Ensure we start with system instruction or inject it into the first user message
    const formattedMessages = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.text }]
    }));

    // Insert context into the first message or as a system prompt if supported.
    // For simplicity with @google/genai, we can just prepend the context to the latest user message
    const lastUserMessageIndex = formattedMessages.length - 1;
    if (lastUserMessageIndex >= 0) {
      formattedMessages[lastUserMessageIndex].parts[0].text = `[시스템 설정: ${contextPrompt}]\n\n사용자 질문: ${formattedMessages[lastUserMessageIndex].parts[0].text}`;
    }

    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: formattedMessages
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
    return NextResponse.json({ error: error.message || 'AI 튜터 응답 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
