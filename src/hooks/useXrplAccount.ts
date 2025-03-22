import { useState, useEffect, useCallback } from "react";
import { Wallet, xrpToDrops, TransactionMetadata } from "xrpl";
import { getSocketServer, getXrplClient } from "../utils/xrpl-client";

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
  txType: string;
  hash: string;
  amount: string;
  fromAddress: string;
  toAddress: string;
  timestamp: string;
  status: "success" | "failed";

  // 에스크로 관련 속성 추가
  isScheduled?: boolean;
  finishAfterTime?: string;
  cancelAfterTime?: string;
  canCancel?: boolean;
  sequence?: number;

  // 수수료 정보
  fee?: string;

  // OfferCreate 관련 속성
  takerGets?:
    | {
        currency?: string;
        issuer?: string;
        value?: string;
      }
    | string;
  takerPays?:
    | {
        currency?: string;
        issuer?: string;
        value?: string;
      }
    | string;

  // TrustSet 관련 속성
  limitAmount?: {
    currency: string;
    issuer: string;
    value: string;
  };
}

// 트랜잭션 요청 타입
export interface TransactionRequest {
  fromAddress: string;
  toAddress: string;
  amount: number;
  secret: string;
  scheduled?: boolean;
  scheduledDelay?: number;
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

// 추가할 타입 정의
export interface EscrowRequest {
  fromAddress: string;
  toAddress: string;
  amount: number;
  secret: string;
  finishAfterSeconds: number; // 몇 초 후에 수신자가 자금을 인출할 수 있는지
  cancelAfterSeconds: number; // 몇 초 후에 송금자가 취소할 수 있는지
}

export interface EscrowFinishRequest {
  ownerAddress: string; // 에스크로 생성자(송금자) 주소
  escrowSequence: number; // 에스크로 생성 시 사용된 시퀀스 번호
  finisherAddress: string; // 완료 요청자(수신자) 주소
  secret: string; // 완료 요청자의 비밀키
}

export interface EscrowCancelRequest {
  ownerAddress: string; // 에스크로 생성자(송금자) 주소
  escrowSequence: number; // 에스크로 생성 시 사용된 시퀀스 번호
  cancellerAddress: string; // 취소 요청자(송금자) 주소
  secret: string; // 취소 요청자의 비밀키
}

export interface EscrowResponse {
  success: boolean;
  message?: string;
  transaction: {
    hash: string;
    type: "create" | "finish" | "cancel";
    status: "success" | "failed";
  } | null;
}

// FT 목록 응답 타입
export interface FTListResponse {
  success: boolean;
  message?: string;
  tokens: any[];
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
        getSocketServer(newAccount.address);
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
          LastLedgerSequence: (await xrplClient.getLedgerIndex()) + 200,
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
            txType: "Payment",
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

        // Ripple ledger의 기준 시간(2000년 1월 1일, 초)
        const RIPPLE_EPOCH = 946684800;

        // 모든 트랜잭션 타입 포함 (Payment, OfferCreate 등)
        const transactions = response.result.transactions
          .filter((tx) => tx.tx) // 유효한 tx 객체가 있는 것만 필터링
          .map((tx) => {
            if (!tx.tx) return null;

            const txObj = tx.tx as any;
            const meta = tx.meta as any;
            const isSuccess =
              meta?.TransactionResult === "tesSUCCESS" ||
              (typeof meta === "string" ? meta === "tesSUCCESS" : false);

            // Ripple ledger time을 Unix timestamp로 변환
            const rippleTimestamp = txObj.date || Date.now() / 1000;
            const unixTimestamp = (rippleTimestamp + RIPPLE_EPOCH) * 1000;

            // 기본 from, to 주소 처리
            let fromAddress = txObj.Account || "";
            let toAddress = "";
            let amount = "0";

            switch (txObj.TransactionType) {
              case "Payment":
                toAddress = txObj.Destination || "";
                amount =
                  typeof txObj.Amount === "string"
                    ? txObj.Amount
                    : txObj.Amount?.value || "0";
                break;
              case "OfferCreate":
                // OfferCreate에서는 거래소 제안이므로 명확한 상대방이 없음
                // TakerPays는 제안자가 지불하려는 금액, TakerGets는 받고 싶은 금액
                toAddress = ""; // 거래소 거래는 상대방이 명확하지 않음

                // TakerPays가 XRP인 경우와 토큰인 경우 구분
                if (typeof txObj.TakerPays === "string") {
                  amount = txObj.TakerPays;
                } else if (txObj.TakerPays && txObj.TakerPays.value) {
                  amount = txObj.TakerPays.value;
                }
                break;
              case "EscrowCreate":
                toAddress = txObj.Destination || "";
                break;
              case "EscrowFinish":
              case "EscrowCancel":
                // EscrowFinish와 EscrowCancel에서는 Owner가 원래 자금을 보관한 송금자일 수 있음
                toAddress = txObj.Owner || "";
                break;
              case "TrustSet":
                // TrustSet은 신뢰선 설정이므로 상대방은 LimitAmount의 발행자
                toAddress = txObj.LimitAmount?.issuer || "";
                amount = txObj.LimitAmount?.value || "0";
                break;
              default:
                break;
            }

            // 예약 송금 관련 추가 정보 (EscrowCreate에 한함)
            let isScheduled = false;
            let finishAfterTime: string | undefined = undefined;
            let sequence: number | undefined = undefined;

            if (txObj.TransactionType === "EscrowCreate") {
              isScheduled = true;
              // 시퀀스 번호 저장
              sequence = txObj.Sequence || 0;

              if (txObj.FinishAfter) {
                const finishAfterUnix =
                  (txObj.FinishAfter + RIPPLE_EPOCH) * 1000;
                finishAfterTime = new Date(finishAfterUnix).toISOString();
              }
            }

            return {
              hash: txObj.hash || "",
              amount: amount,
              fromAddress,
              toAddress,
              timestamp: new Date(unixTimestamp).toISOString(),
              status: isSuccess ? "success" : "failed",
              txType: txObj.TransactionType, // 거래 종류 표시(Payment, OfferCreate 등)
              isScheduled, // 예약 송금 여부 (EscrowCreate인 경우 true)
              finishAfterTime, // EscrowCreate의 FinishAfter 시간 (ISO 형식)
              sequence, // 에스크로 시퀀스 번호 추가
              fee: txObj.Fee || "0", // 수수료 정보 추가
              // OfferCreate 관련 정보 추가
              takerGets: txObj.TakerGets,
              takerPays: txObj.TakerPays,
              // TrustSet 관련 정보 추가
              limitAmount: txObj.LimitAmount,
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
            txType: txObj.TransactionType,
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

  // 특정 발행자의 FT 목록 조회 함수
  const getFTsByIssuer = useCallback(
    async (issuerAddress: string): Promise<FTListResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        const xrplClient = await getXrplClient();

        if (!xrplClient) {
          throw new Error("XRPL 클라이언트가 초기화되지 않았습니다.");
        }

        let shouldDisconnect = false;
        if (!xrplClient.isConnected()) {
          console.log("[FTService] XRPL에 연결 시도...");
          await xrplClient.connect();
          shouldDisconnect = true;
          console.log("[FTService] XRPL 연결 성공");
        }

        try {
          const response = await xrplClient.request({
            command: "account_lines",
            account: issuerAddress,
          });
          return {
            success: true,
            tokens: response.result.lines,
          };
        } finally {
          // 연결을 시작한 경우에만 연결 종료
          if (shouldDisconnect && xrplClient.isConnected()) {
            try {
              console.log("[FTService] XRPL 연결 종료 중...");
              await xrplClient.disconnect();
              console.log("[FTService] XRPL 연결 종료 완료");
            } catch (err) {
              console.error("[FTService] 연결 종료 중 오류:", err);
            }
          }
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "알 수 없는 오류";
        setError(errorMessage);

        return {
          success: false,
          message: errorMessage,
          tokens: [],
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
    getFTsByIssuer,
  };
};
