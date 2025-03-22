import { TransactionHistoryResponseDto } from "@/types/transaction/request.dto";

async function fetchTransactionHistory(
  address: string
): Promise<TransactionHistoryResponseDto> {
  const response = await fetch(
    `/api/transactions/history/${encodeURIComponent(address)}`,
    {
      method: "GET",
    }
  );

  if (!response.ok) {
    throw new Error("API 요청 실패");
  }

  const data = await response.json();
  return data as TransactionHistoryResponseDto;
}

export { fetchTransactionHistory };
