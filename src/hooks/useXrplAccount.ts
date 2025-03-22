import dayjs from "dayjs";
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

        const transactions = response.result.transactions
          // Payment와 에스크로 관련 거래 모두 필터링
          .filter(
            (tx) =>
              tx.tx &&
              [
                "Payment",
                "EscrowCreate",
                "EscrowFinish",
                "EscrowCancel",
              ].includes(tx.tx.TransactionType)
          )
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
            switch (txObj.TransactionType) {
              case "Payment":
                toAddress = txObj.Destination || "";
                break;
              case "EscrowCreate":
                toAddress = txObj.Destination || "";
                break;
              case "EscrowFinish":
              case "EscrowCancel":
                // EscrowFinish와 EscrowCancel에서는 Owner가 원래 자금을 보관한 송금자일 수 있음
                toAddress = txObj.Owner || "";
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
              amount: typeof txObj.Amount === "string" ? txObj.Amount : "0",
              fromAddress,
              toAddress,
              timestamp: new Date(unixTimestamp).toISOString(),
              status: isSuccess ? "success" : "failed",
              txType: txObj.TransactionType, // 거래 종류 표시(Payment, EscrowCreate 등)
              isScheduled, // 예약 송금 여부 (EscrowCreate인 경우 true)
              finishAfterTime, // EscrowCreate의 FinishAfter 시간 (ISO 형식)
              sequence, // 에스크로 시퀀스 번호 추가
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

  // // XRP 전송 함수 (예약송금 기능 포함)
  // const sendPayment2 = useCallback(
  //   async (txRequest: TransactionRequest): Promise<TransactionResponse> => {
  //     setIsLoading(true);
  //     setError(null);

  //     try {
  //       const xrplClient = await getXrplClient();

  //       if (!xrplClient) {
  //         throw new Error("XRPL 클라이언트가 초기화되지 않았습니다.");
  //       }

  //       const wallet = Wallet.fromSeed(txRequest.secret);
  //       console.log(wallet, "wallet", txRequest);

  //       let result;
  //       // Ripple 기준 시간
  //       const RIPPLE_EPOCH = 946684800;
  //       let finishAfter;

  //       // 1. 현재 시간을 초 단위로 계산
  //       const now = Math.floor(Date.now() / 1000);

  //       // 2. 예약 시간 계산 (초 단위)
  //       finishAfter = now + (txRequest.scheduledDelay || 5) * 60; // 분 -> 초 변환

  //       // 3. 로그 출력 (사람이 읽을 수 있는 형식)
  //       console.log("예약 설정 시간:");
  //       console.log(
  //         "- 완료 가능 시간:",
  //         dayjs(finishAfter * 1000).format("YYYY-MM-DD HH:mm:ss")
  //       );

  //       // 4. 트랜잭션 객체 생성 (Ripple 타임스탬프로 전달)
  //       const escrowTx = {
  //         TransactionType: "EscrowCreate",
  //         Account: txRequest.fromAddress,
  //         Amount: xrpToDrops(txRequest.amount),
  //         Destination: txRequest.toAddress,
  //         FinishAfter: finishAfter - RIPPLE_EPOCH, // Ripple 타임스탬프 사용
  //       };

  //       // 트랜잭션 준비, 서명, 제출
  //       const prepared = await xrplClient.autofill(escrowTx as any);
  //       console.log(prepared, "prepared escrow");
  //       const signed = wallet.sign(prepared);
  //       result = await xrplClient.submit(signed.tx_blob);
  //       console.log("EscrowCreate 결과:", result);

  //       // 트랜잭션 결과 처리
  //       const isSuccess = result.result.engine_result === "tesSUCCESS";
  //       const txType = txRequest.scheduled ? "EscrowCreate" : "Payment";

  //       const response = {
  //         success: isSuccess,
  //         message: isSuccess
  //           ? undefined
  //           : `Transaction failed: ${
  //               result.result.engine_result_message || "Unknown error"
  //             }`,
  //         transaction: {
  //           txType,
  //           hash: result.result.tx_json.hash || "",
  //           amount: txRequest.amount.toString(),
  //           fromAddress: txRequest.fromAddress,
  //           toAddress: txRequest.toAddress,
  //           timestamp: new Date().toISOString(),
  //           status: isSuccess ? ("success" as const) : ("failed" as const),
  //           // 예약 송금인 경우 추가 정보 포함
  //           ...(txRequest.scheduled && {
  //             isScheduled: true,
  //             finishAfterTime: dayjs(finishAfter * 1000).toISOString(),
  //             sequence: result.result.tx_json.Sequence || 0,
  //           }),
  //         },
  //       };

  //       // 트랜잭션 성공 시 계정 잔액 업데이트
  //       if (
  //         response.success &&
  //         account &&
  //         account.address === txRequest.fromAddress
  //       ) {
  //         await getAccountInfo(account.address);
  //       }

  //       return response;
  //     } catch (error) {
  //       const errorMessage =
  //         error instanceof Error ? error.message : "알 수 없는 오류";
  //       setError(errorMessage);
  //       console.log(errorMessage);
  //       return {
  //         success: false,
  //         message: errorMessage,
  //         transaction: null,
  //       };
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   },
  //   [account, getAccountInfo]
  // );

  // // 예약 송금 완료(인출) 함수
  // const finishEscrow = useCallback(
  //   async (request: EscrowFinishRequest): Promise<EscrowResponse> => {
  //     setIsLoading(true);
  //     setError(null);

  //     try {
  //       const xrplClient = await getXrplClient();

  //       if (!xrplClient) {
  //         throw new Error("XRPL 클라이언트가 초기화되지 않았습니다.");
  //       }

  //       const wallet = Wallet.fromSeed(request.secret);

  //       // 트랜잭션 준비
  //       const prepared = await xrplClient.autofill({
  //         TransactionType: "EscrowFinish",
  //         Account: request.finisherAddress,
  //         Owner: request.ownerAddress,
  //         OfferSequence: request.escrowSequence,
  //         LastLedgerSequence: (await xrplClient.getLedgerIndex()) + 200,
  //       });

  //       // 트랜잭션 서명
  //       const signed = wallet.sign(prepared);

  //       // 트랜잭션 제출
  //       const result = await xrplClient.submitAndWait(signed.tx_blob);

  //       console.log("에스크로 완료 결과:", result);

  //       // 트랜잭션 결과 확인
  //       const txResult = result.result;
  //       const meta = txResult.meta as TransactionMetadata;
  //       const transactionResult =
  //         typeof meta === "string" ? meta : meta?.TransactionResult;
  //       const isSuccess = transactionResult === "tesSUCCESS";

  //       const response = {
  //         success: isSuccess,
  //         message: isSuccess
  //           ? "에스크로가 성공적으로 완료되었습니다."
  //           : `에스크로 완료 실패: ${transactionResult || "알 수 없는 오류"}`,
  //         transaction: {
  //           hash: txResult.hash,
  //           type: "finish" as const,
  //           status: isSuccess ? ("success" as const) : ("failed" as const),
  //         },
  //       };

  //       // 성공 시 계정 잔액 업데이트 (수신자)
  //       if (
  //         isSuccess &&
  //         account &&
  //         account.address === request.finisherAddress
  //       ) {
  //         await getAccountInfo(account.address);
  //       }

  //       return response;
  //     } catch (error) {
  //       const errorMessage =
  //         error instanceof Error ? error.message : "알 수 없는 오류";
  //       setError(errorMessage);
  //       console.error("에스크로 완료 오류:", error);
  //       return {
  //         success: false,
  //         message: `에스크로 완료 실패: ${errorMessage}`,
  //         transaction: null,
  //       };
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   },
  //   [account, getAccountInfo]
  // );

  // // 예약 송금 취소 함수
  // const cancelEscrow = useCallback(
  //   async (request: EscrowCancelRequest): Promise<EscrowResponse> => {
  //     setIsLoading(true);
  //     setError(null);

  //     try {
  //       const xrplClient = await getXrplClient();

  //       if (!xrplClient) {
  //         throw new Error("XRPL 클라이언트가 초기화되지 않았습니다.");
  //       }

  //       const wallet = Wallet.fromSeed(request.secret);

  //       // 트랜잭션 준비
  //       const prepared = await xrplClient.autofill({
  //         TransactionType: "EscrowCancel",
  //         Account: request.cancellerAddress,
  //         Owner: request.ownerAddress,
  //         OfferSequence: request.escrowSequence,
  //         LastLedgerSequence: (await xrplClient.getLedgerIndex()) + 200,
  //       });

  //       // 트랜잭션 서명
  //       const signed = wallet.sign(prepared);

  //       // 트랜잭션 제출
  //       const result = await xrplClient.submitAndWait(signed.tx_blob);

  //       console.log("에스크로 취소 결과:", result);

  //       // 트랜잭션 결과 확인
  //       const txResult = result.result;
  //       const meta = txResult.meta as TransactionMetadata;
  //       const transactionResult =
  //         typeof meta === "string" ? meta : meta?.TransactionResult;
  //       const isSuccess = transactionResult === "tesSUCCESS";

  //       const response = {
  //         success: isSuccess,
  //         message: isSuccess
  //           ? "에스크로가 성공적으로 취소되었습니다."
  //           : `에스크로 취소 실패: ${transactionResult || "알 수 없는 오류"}`,
  //         transaction: {
  //           hash: txResult.hash,
  //           type: "cancel" as const,
  //           status: isSuccess ? ("success" as const) : ("failed" as const),
  //         },
  //       };

  //       // 성공 시 계정 잔액 업데이트 (취소자 = 송금자)
  //       if (
  //         isSuccess &&
  //         account &&
  //         account.address === request.cancellerAddress
  //       ) {
  //         await getAccountInfo(account.address);
  //       }

  //       return response;
  //     } catch (error) {
  //       const errorMessage =
  //         error instanceof Error ? error.message : "알 수 없는 오류";
  //       setError(errorMessage);
  //       console.error("에스크로 취소 오류:", error);
  //       return {
  //         success: false,
  //         message: `에스크로 취소 실패: ${errorMessage}`,
  //         transaction: null,
  //       };
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   },
  //   [account, getAccountInfo]
  // );

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
