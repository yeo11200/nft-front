// src/dto/llm-generate-response.dto.ts
// 성공 시 응답 구조
export interface LlmGenerateResponseDto {
  success: boolean; // 요청 성공 여부
  response: string; // 생성된 텍스트
  message?: string; // 에러 메시지 등 추가 정보
  friend: string;
  my: string;
}
