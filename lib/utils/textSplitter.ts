export function splitIntoLines(text: string, maxLineLength: number = 35): string[] {
  if (!text) return [];
  
  // 문단 앞의 들여쓰기(공백)를 보존
  const leadingSpaceMatch = text.match(/^\s+/);
  const leadingSpace = leadingSpaceMatch ? leadingSpaceMatch[0] : '';
  const remainingText = text.substring(leadingSpace.length);
  
  const words = remainingText.split(' ').filter(Boolean);
  const lines: string[] = [];
  let currentLine = leadingSpace;

  for (const word of words) {
    if ((currentLine + word).length > maxLineLength && currentLine.trim().length > 0) {
      // 줄의 마지막에 있는 공백만 제거하여 추가
      lines.push(currentLine.replace(/\s+$/, ''));
      currentLine = word + ' ';
    } else {
      currentLine += word + ' ';
    }
  }
  
  if (currentLine) {
    lines.push(currentLine.replace(/\s+$/, ''));
  }
  
  return lines;
}
