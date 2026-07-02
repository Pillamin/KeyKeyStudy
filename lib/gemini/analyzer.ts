import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Keyword, QuizItem } from '@/lib/firebase/types';

export interface GeminiContentResult {
  step1_text_list: string[];
  step2_keywords_list: Keyword[];
  step3_quiz_list: QuizItem[];
}

const SYSTEM_PROMPT = `
당신은 중학교 교과서 학습 콘텐츠 전문가입니다.
아래 교과서 본문 텍스트를 분석하여 JSON 형식으로만 응답하세요. 다른 텍스트, 마크다운 코드블록, 설명은 절대 포함하지 마세요.

응답 형식:
{
  "step1_text_list": ["완전한 문장1", "완전한 문장2", ...],
  "step2_keywords_list": [{"keyword": "핵심단어", "description": "이 단어의 명확한 정의와 설명 또는 중요 문장"}, ...],
  "step3_quiz_list": [
    {
      "type": "blank",
      "question": "___ 는(은) [설명] 입니다. 빈칸에 들어갈 단어는?",
      "options": ["보기1", "보기2", "보기3", "보기4"],
      "answer": 1,
      "explanation": "정답 해설"
    },
    {
      "type": "matching",
      "question": "[단어의 정의/설명]에 해당하는 단어는?",
      "options": ["보기1", "보기2", "보기3", "보기4"],
      "answer": 2,
      "explanation": "정답 해설"
    }
  ]
}

규칙:
- step1_text_list: 원문에서 완전한 문장만 추출 (최소 5문장, 최대 20문장)
- step2_keywords_list: 핵심 개념 단어 최소 5개, 최대 15개
- step3_quiz_list: blank형과 matching형 각각 최소 3개씩, 총 최소 6문제
- 4지선다 보기(options)는 반드시 4개
- answer는 1~4 사이의 정수
- 모든 content는 한국어로 작성
`;

export async function analyzeTextContent(textContent: string, subject: string, unit: string, title: string): Promise<GeminiContentResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const prompt = `과목: ${subject}\n단원: ${unit}\n차시: ${title}\n\n교과서 본문:\n${textContent}\n\n${SYSTEM_PROMPT}`;
  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  const parsed = JSON.parse(cleaned) as GeminiContentResult;
  if (!Array.isArray(parsed.step1_text_list) || !Array.isArray(parsed.step2_keywords_list) || !Array.isArray(parsed.step3_quiz_list)) {
    throw new Error('Gemini 응답 형식이 올바르지 않습니다.');
  }
  return parsed;
}
