export interface AccountResponseDto {
  success: boolean;
  account: {
    address: string;
    secret: string;
    balance: string;
  };
}
