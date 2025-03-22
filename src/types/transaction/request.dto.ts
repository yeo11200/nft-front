// src/dto/transaction.dto.ts
// 단일 거래(transaction)를 표현하는 DTO
export interface TransactionDto {
  hash: string;
  amount: string; // 문자열로 표현 (필요에 따라 number로 변환 가능)
  from: string;
  to: string;
  timestamp: string; // ISO8601 등 문자열 포맷
  status: "success" | "failed" | "pending";
}

// src/dto/transaction-history-response.dto.ts
// GET /api/transactions/history/{address} 성공 시 응답
export interface TransactionHistoryResponseDto {
  success: boolean;
  transactions: TransactionDto[];
}
