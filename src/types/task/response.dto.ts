// Task response type definitions

/**
 * Available task names in the system
 */
export enum TaskName {
  GET_ACCOUNT = 'get-account',
  PAYMENT_XRP = 'payment-xrp',
  GET_TRANSACTION_HISTORY = 'get-transaction-history',
  GET_TRANSACTION_DETAIL = 'get-transaction-detail'
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
    status: 'success' | 'fail';
    message: string;
  };
  data: {
    task: TaskName | null;
    parameters: TaskParameters | null;
  };
} 