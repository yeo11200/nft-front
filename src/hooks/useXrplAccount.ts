import { useState, useEffect, useCallback } from "react";
import { Wallet, xrpToDrops, TransactionMetadata } from "xrpl";
import { getXrplClient } from "../utils/xrpl-client";

// 계정 타입 정의
export interface Account {
  address: string;
  secret?: string;
  balance: string;
  userId?: string;
}

// 계정 생성 응답 타입
export interface AccountCreateResponse {
  success: boolean;
  message?: string;
  account: Account | null;
}

// 계정 정보 응답 타입
export interface AccountInfoResponse {
  success: boolean;
  message?: string;
  account: Account | null;
}

// 트랜잭션 타입 정의
export interface Transaction {
  hash: string;
  amount: string;
  fromAddress: string;
  toAddress: string;
  timestamp: string;
  status: "success" | "failed";
}

// 트랜잭션 요청 타입
export interface TransactionRequest {
  fromAddress: string;
  toAddress: string;
  amount: number;
  secret: string;
}

// 트랜잭션 응답 타입
export interface TransactionResponse {
  success: boolean;
  message?: string;
  transaction: Transaction | null;
}

// 트랜잭션 내역 응답 타입
export interface TransactionHistoryResponse {
  success: boolean;
  message?: string;
  transactions: Transaction[];
}

/**
 * XRPL 계정 및 트랜잭션 관련 기능을 제공하는 React 훅
 */
export const useXrplAccount = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<Account | null>(null);

  // 로컬 스토리지에서 계정 정보 불러오기
  useEffect(() => {
    const savedAccount = localStorage.getItem("userInfo");
    if (savedAccount) {
      console.log(JSON.parse(savedAccount), "savedAccount");
      try {
        setAccount(JSON.parse(savedAccount));
      } catch (err) {
        console.error("저장된 계정 정보를 불러오는 중 오류 발생:", err);
        localStorage.removeItem("userInfo");
      }
    }
  }, []);

  // 계정 생성 함수
  const createAccount = useCallback(
    async (nickname: string): Promise<AccountCreateResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        const xrplClient = await getXrplClient();

        if (!xrplClient) {
          throw new Error("XRPL 클라이언트가 초기화되지 않았습니다.");
        }

        const wallet = await Wallet.generate();

        // Fund the account on testnet
        const result = await xrplClient.fundWallet(wallet);

        const newAccount = {
          address: wallet.address,
          secret: wallet.seed,
          balance: result.balance.toString(),
          userId: nickname,
        };

        // 로컬 스토리지에 계정 정보 저장
        localStorage.setItem("userInfo", JSON.stringify(newAccount));
        setAccount(newAccount);

        return {
          success: true,
          account: newAccount,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "알 수 없는 오류";
        setError(errorMessage);
        return {
          success: false,
          message: errorMessage,
          account: null,
        };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // 계정 정보 조회 함수
  const getAccountInfo = useCallback(
    async (address?: string, secret?: string): Promise<AccountInfoResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        const xrplClient = await getXrplClient();

        if (!xrplClient) {
          throw new Error("XRPL 클라이언트가 초기화되지 않았습니다.");
        }

        const accountAddress = address || account?.address;
        const accountSecret = secret || account?.secret;
        console.log(accountAddress, "accountAddress");
        if (!accountAddress) {
          throw new Error("계정 주소가 제공되지 않았습니다.");
        }

        const response = await xrplClient.request({
          command: "account_info",
          account: accountAddress,
          ledger_index: "validated",
        });

        console.log(response, "response", accountAddress);

        const accountInfo: Account = {
          address: accountAddress,
          secret: accountSecret,
          balance: response.result.account_data.Balance,
        };

        // 현재 계정 정보 업데이트 (주소가 일치하는 경우)
        if (account && account.address === accountAddress) {
          const updatedAccount = { ...account, balance: accountInfo.balance };
          localStorage.setItem("userInfo", JSON.stringify(updatedAccount));
          setAccount(updatedAccount);
        }

        return {
          success: true,
          account: accountInfo,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "알 수 없는 오류";
        setError(errorMessage);
        return {
          success: false,
          message: errorMessage,
          account: null,
        };
      } finally {
        setIsLoading(false);
      }
    },
    [account]
  );

  // 계정 로그아웃 함수
  const logoutAccount = useCallback(() => {
    localStorage.removeItem("userInfo");
    setAccount(null);
  }, []);

  // XRP 전송 함수
  const sendPayment = useCallback(
    async (txRequest: TransactionRequest): Promise<TransactionResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        const xrplClient = await getXrplClient();

        if (!xrplClient) {
          throw new Error("XRPL 클라이언트가 초기화되지 않았습니다.");
        }

        const wallet = Wallet.fromSeed(txRequest.secret);

        console.log(wallet, "wallet", txRequest);

        // 트랜잭션 준비
        const prepared = await xrplClient.autofill({
          TransactionType: "Payment",
          Account: txRequest.fromAddress,
          Amount: xrpToDrops(txRequest.amount),
          Destination: txRequest.toAddress,
        });

        console.log(prepared, "prepared");
        // 트랜잭션 서명
        const signed = wallet.sign(prepared);

        // 트랜잭션 제출
        const result = await xrplClient.submitAndWait(signed.tx_blob);

        console.log("트랜잭션 제출 결과:", result);

        // 트랜잭션 결과 확인
        const txResult = result.result;
        const meta = txResult.meta as TransactionMetadata;
        const transactionResult =
          typeof meta === "string" ? meta : meta?.TransactionResult;
        const isSuccess = transactionResult === "tesSUCCESS";

        // tec, tel, tem 등으로 시작하는 결과 코드는 실패를 의미
        const status = isSuccess ? ("success" as const) : ("failed" as const);

        const response = {
          success: isSuccess,
          message: isSuccess
            ? undefined
            : `Transaction failed: ${transactionResult || "Unknown error"}`,
          transaction: {
            hash: txResult.hash,
            amount: txRequest.amount.toString(),
            fromAddress: txRequest.fromAddress,
            toAddress: txRequest.toAddress,
            timestamp: new Date().toISOString(),
            status,
          },
        };

        // 트랜잭션 성공 후 계정 잔액 업데이트
        if (
          response.success &&
          account &&
          account.address === txRequest.fromAddress
        ) {
          await getAccountInfo(account.address);
        }

        return response;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "알 수 없는 오류";
        setError(errorMessage);
        console.log(errorMessage);
        return {
          success: false,
          message: errorMessage,
          transaction: null,
        };
      } finally {
        setIsLoading(false);
      }
    },
    [account, getAccountInfo]
  );

  // 트랜잭션 내역 조회 함수
  const getTransactionHistory = useCallback(
    async (address?: string): Promise<TransactionHistoryResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        const xrplClient = await getXrplClient();

        if (!xrplClient) {
          throw new Error("XRPL 클라이언트가 초기화되지 않았습니다.");
        }

        const accountAddress = address || account?.address;
        if (!accountAddress) {
          throw new Error("계정 주소가 제공되지 않았습니다.");
        }

        const response = await xrplClient.request({
          command: "account_tx",
          account: accountAddress,
          limit: 20,
        });

        const RIPPLE_EPOCH = 946684800; // 2000년 1월 1일 (초)

        const transactions = response.result.transactions
          .filter((tx) => tx.tx && tx.tx.TransactionType === "Payment")
          .map((tx) => {
            if (!tx.tx) return null;

            const txObj = tx.tx as any;
            const meta = tx.meta as any;
            const isSuccess =
              meta?.TransactionResult === "tesSUCCESS" ||
              (typeof meta === "string" ? meta === "tesSUCCESS" : false);

            // Ripple 타임스탬프를 JavaScript 타임스탬프로 변환
            const rippleTimestamp = tx.tx.date || Date.now() / 1000;
            const unixTimestamp = (rippleTimestamp + RIPPLE_EPOCH) * 1000;

            return {
              hash: txObj.hash || "",
              amount: typeof txObj.Amount === "string" ? txObj.Amount : "0",
              fromAddress: txObj.Account,
              toAddress: txObj.Destination,
              timestamp: new Date(unixTimestamp).toISOString(),
              status: isSuccess ? "success" : "failed",
            } as Transaction;
          })
          .filter((tx): tx is Transaction => tx !== null);

        return {
          success: true,
          transactions,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "알 수 없는 오류";
        setError(errorMessage);
        return {
          success: false,
          message: errorMessage,
          transactions: [],
        };
      } finally {
        setIsLoading(false);
      }
    },
    [account]
  );

  // 트랜잭션 상세 정보 조회 함수
  const getTransactionDetails = useCallback(
    async (txHash: string): Promise<TransactionResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        const xrplClient = await getXrplClient();

        if (!xrplClient) {
          throw new Error("XRPL 클라이언트가 초기화되지 않았습니다.");
        }

        const response = await xrplClient.request({
          command: "tx",
          transaction: txHash,
        });

        const RIPPLE_EPOCH = 946684800; // 2000년 1월 1일 (초)

        const txObj = response.result as any;
        const isSuccess =
          txObj.meta?.TransactionResult === "tesSUCCESS" ||
          (typeof txObj.meta === "string"
            ? txObj.meta === "tesSUCCESS"
            : false);

        // Ripple 타임스탬프를 JavaScript 타임스탬프로 변환
        const rippleTimestamp = txObj.date || Date.now() / 1000;
        const unixTimestamp = (rippleTimestamp + RIPPLE_EPOCH) * 1000;

        const status = isSuccess ? ("success" as const) : ("failed" as const);

        return {
          success: isSuccess,
          message: isSuccess
            ? undefined
            : `Transaction failed: ${
                txObj.meta?.TransactionResult || "Unknown error"
              }`,
          transaction: {
            hash: txObj.hash,
            amount: typeof txObj.Amount === "string" ? txObj.Amount : "0",
            fromAddress: txObj.Account,
            toAddress: txObj.Destination,
            timestamp: new Date(unixTimestamp).toISOString(),
            status,
          },
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "알 수 없는 오류";
        setError(errorMessage);
        return {
          success: false,
          message: errorMessage,
          transaction: null,
        };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    account,
    isLoading,
    error,
    createAccount,
    getAccountInfo,
    logoutAccount,
    sendPayment,
    getTransactionHistory,
    getTransactionDetails,
  };
};
