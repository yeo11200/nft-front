// Task response type definitions

/**
 * Available task names in the system
 */
export enum TaskName {
  GET_ACCOUNT = "get-account", // 내 지갑으로 이동
  PAYMENT_XRP = "payment-xrp", // 송금 관련 팝업 노출
  GET_TRANSACTION_HISTORY = "get-transaction-history", // 거래 내역 이동
  GET_TRANSACTION_DETAIL = "get-transaction-detail", // 거래 상세 팝업 노출
  GO_TO_MAIN = "go-to-main",
  GET_FRIEND_LIST = "get-friend-list", // 친구 목록 조회
  GET_FRIEND_DETAIL = "get-friend-detail", // 친구 상세 정보 조회
}

/**
 * Parameters for transfer task
 */
export interface TransferTaskParameters {
  fromAddress: string;
  toAddress: string;
  amount: string;
}

/**
 * Parameters for check balance task
 */
export interface CheckBalanceTaskParameters {
  address: string;
}

/**
 * Parameters for get account task
 */
export interface GetAccountParameters {
  address: string;
}

/**
 * Parameters for payment XRP task
 */
export interface PaymentXrpParameters {
  fromAddress: string;
  toAddress: string;
  amount: string;
}

/**
 * Parameters for transaction history task
 */
export interface GetTransactionHistoryParameters {
  address: string;
}

/**
 * Parameters for transaction detail task
 */
export interface GetTransactionDetailParameters {
  transactionId: string;
}

/**
 * Union type for all possible parameter types
 */
export type TaskParameters =
  | TransferTaskParameters
  | CheckBalanceTaskParameters
  | GetAccountParameters
  | PaymentXrpParameters
  | GetTransactionHistoryParameters
  | GetTransactionDetailParameters
  | Record<string, string>;

/**
 * Response structure from the LLM API
 */
export interface TaskResponseDto {
  statusInfo: {
    status: "success" | "fail";
    message: string;
  };
  data: {
    task: TaskName | null;
    parameters: TaskParameters | null;
  };
}
