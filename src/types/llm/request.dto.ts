// src/dto/llm-generate-request.dto.ts
// 요청 바디에 포함될 데이터 구조
export interface LlmGenerateRequestDto {
  prompt: string; // LLM에 전달할 프롬프트 (필수)
  model?: string; // 사용할 LLM 모델 (예: 'gpt-3.7b'), 미지정 시 기본값 사용
  my: any; // 사용자 정보
  friends: any[]; // 친구 목록
  fts: any[]; // 토큰 목록
}
