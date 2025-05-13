import { useState, useEffect, useCallback } from "react";
import { Wallet, xrpToDrops, dropsToXrp, TransactionMetadata } from "xrpl";
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

// 통화 금액 인터페이스
export interface Currency {
  currency: string; // 화폐 코드
  issuer?: string; // 발행자 주소 (XRP가 아닌 경우 필수)
  value?: string; // 금액 (XRP가 아닌 경우 문자열 형태)
}

// OfferCreate 요청 인터페이스
export interface OfferCreateRequest {
  account: string; // 오퍼를 생성할 계정
  takerGets: Currency | string; // 판매할 통화/금액 (XRP인 경우 문자열)
  takerPays: Currency | string; // 구매할 통화/금액 (XRP인 경우 문자열)
  expiration?: number; // 만료 시간 (선택 사항)
  offerSequence?: number; // 대체할 기존 오퍼 시퀀스 (선택 사항)
  passive?: boolean; // 수동 오퍼 여부 (선택 사항)
  immediateOrCancel?: boolean; // 즉시 체결 또는 취소 여부 (선택 사항)
  fillOrKill?: boolean; // 전체 체결 또는 취소 여부 (선택 사항)
  seed: string; // 계정의 비밀 시드
}

// OfferCreate 응답 인터페이스
export interface OfferCreateResponse {
  success: boolean;
  message?: string;
  result?: any;
  account?: string;
  offerSequence?: string | null;
  takerGets?: Currency | string;
  takerPays?: Currency | string;
  transactionResult?: string;
  error?: string;
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
        if (!accountAddress) {
          throw new Error("계정 주소가 제공되지 않았습니다.");
        }

        const response = await xrplClient.request({
          command: "account_info",
          account: accountAddress,
          ledger_index: "validated",
        });

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

        // 트랜잭션 준비
        const prepared = await xrplClient.autofill({
          TransactionType: "Payment",
          Account: txRequest.fromAddress,
          Amount: xrpToDrops(txRequest.amount),
          Destination: txRequest.toAddress,
          LastLedgerSequence: (await xrplClient.getLedgerIndex()) + 200,
        });

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

  /**
   * 현재 네트워크 수수료 정보를 가져옴
   * @returns 권장 수수료 (drops 단위)
   */
  const getFeeRecommendation = useCallback(async (): Promise<string> => {
    console.log("[useXrplAccount] 네트워크 수수료 정보 요청 중...");

    try {
      const xrplClient = await getXrplClient();

      if (!xrplClient) {
        throw new Error("XRPL 클라이언트가 초기화되지 않았습니다.");
      }

      const feeResult = await xrplClient.request({
        command: "fee",
      });

      // 다양한 수수료 레벨 중 선택 (open, medium, high)
      const openFee = feeResult.result.drops.open_ledger_fee;
      const mediumFee = feeResult.result.drops.median_fee;
      const highFee = feeResult.result.drops.minimum_fee;

      // 현재 네트워크 부하에 따라 적절한 수수료 선택
      // 일반적으로 median_fee는 중간 정도의 우선순위를 가짐
      const recommendedFee = mediumFee;

      console.log(
        `[useXrplAccount] 수수료 정보 - 낮음: ${highFee}, 중간: ${mediumFee}, 높음: ${openFee}`
      );
      console.log(
        `[useXrplAccount] 권장 수수료: ${recommendedFee} drops (${dropsToXrp(
          recommendedFee
        )} XRP)`
      );

      // 최소 수수료보다 작지 않도록 확인
      return recommendedFee > highFee ? recommendedFee : highFee;
    } catch (error) {
      console.error(
        "[useXrplAccount] 수수료 정보 요청 실패, 기본값 사용:",
        error
      );
      // 기본 수수료 반환 (10 drops)
      return xrpToDrops("0.00001");
    }
  }, []);

  /**
   * 화폐 코드 형식 검증 및 변환
   * @param currencyCode 원본 화폐 코드
   * @returns 유효한 XRPL 화폐 코드
   */
  const validateCurrencyCode = useCallback((currencyCode: string): string => {
    console.log(`[useXrplAccount] 화폐 코드 검증: "${currencyCode}"`);

    // XRP 특수 처리
    if (currencyCode.toUpperCase() === "XRP") {
      return "XRP";
    }

    // 3글자 ISO 표준 코드인 경우
    if (currencyCode.length === 3) {
      console.log(`[useXrplAccount] 3글자 ISO 코드 사용: ${currencyCode}`);
      return currencyCode;
    }
    

    // 이미 40자 16진수인 경우
    if (currencyCode.length === 40 && /^[0-9A-F]+$/i.test(currencyCode)) {
      console.log(`[useXrplAccount] 40자 16진수 코드 사용: ${currencyCode}`);
      return currencyCode;
    }

    // 3글자가 아닌 경우 16진수로 변환 후 40자로 패딩
    console.log(
      `[useXrplAccount] 화폐 코드 변환 필요: ${currencyCode} (현재 ${currencyCode.length}글자)`
    );

    // 문자열을 16진수로 변환
    let hexCode = Buffer.from(currencyCode, "utf8")
      .toString("hex")
      .toUpperCase();

    // 40자에 맞게 패딩 (앞에 0으로 채움)
    while (hexCode.length < 40) {
      hexCode = "0" + hexCode;
    }

    // 40자를 초과하면 앞에서부터 40자만 사용
    if (hexCode.length > 40) {
      hexCode = hexCode.substring(0, 40);
    }

    console.log(`[useXrplAccount] 변환된 화폐 코드: ${hexCode}`);
    return hexCode;
  }, []);

  /**
   * 오퍼 생성 (OfferCreate)
   * XRP Ledger의 내장 DEX에 거래 제안 생성
   */
  const createOffer = useCallback(
    async (request: OfferCreateRequest): Promise<OfferCreateResponse> => {
      setIsLoading(true);
      setError(null);

      let shouldDisconnect = false;

      try {
        const xrplClient = await getXrplClient();

        if (!xrplClient) {
          throw new Error("XRPL 클라이언트가 초기화되지 않았습니다.");
        }

        if (!xrplClient.isConnected()) {
          console.log("[useXrplAccount] XRPL에 연결 시도...");
          await xrplClient.connect();
          shouldDisconnect = true;
          console.log("[useXrplAccount] XRPL 연결 성공");
        }

        // 현재 레저 정보 가져오기
        console.log("[useXrplAccount] 현재 레저 정보 요청 중...");
        const ledgerInfo = await xrplClient.request({
          command: "ledger_current",
        });
        const currentLedgerSequence = ledgerInfo.result.ledger_current_index;
        console.log(
          `[useXrplAccount] 현재 레저 시퀀스: ${currentLedgerSequence}`
        );

        // 네트워크 수수료 가져오기
        const networkFee = await getFeeRecommendation();

        // 계정 정보 및 시퀀스 번호 가져오기
        console.log(
          `[useXrplAccount] 계정 정보 요청 중... (주소: ${request.account})`
        );
        const wallet = Wallet.fromSeed(request.seed);

        // 월렛 주소와 요청 계정 일치 확인
        if (wallet.address !== request.account) {
          throw new Error(
            "시드에서 생성된 주소가 요청 계정 주소와 일치하지 않습니다."
          );
        }

        const accountInfo = await xrplClient.request({
          command: "account_info",
          account: request.account,
        });

        const sequence = accountInfo.result.account_data.Sequence;
        console.log(`[useXrplAccount] 계정 시퀀스 번호: ${sequence}`);

        // TakerGets와 TakerPays 처리
        let takerGets: any;
        let takerPays: any;

        // TakerGets 처리 (판매할 통화)
        if (typeof request.takerGets === "string") {
          // XRP인 경우
          takerGets = xrpToDrops(request.takerGets);
          console.log(
            `[useXrplAccount] TakerGets: ${request.takerGets} XRP (${takerGets} drops)`
          );
        } else {
          // 다른 통화인 경우
          const currency = validateCurrencyCode(request.takerGets.currency);
          takerGets = {
            currency: currency,
            issuer: request.takerGets.issuer,
            value: request.takerGets.value,
          };
          console.log(
            `[useXrplAccount] TakerGets: ${JSON.stringify(takerGets)}`
          );
        }

        // TakerPays 처리 (구매할 통화)
        if (typeof request.takerPays === "string") {
          // XRP인 경우
          takerPays = xrpToDrops(request.takerPays);
          console.log(
            `[useXrplAccount] TakerPays: ${request.takerPays} XRP (${takerPays} drops)`
          );
        } else {
          // 다른 통화인 경우
          const currency = validateCurrencyCode(request.takerPays.currency);
          takerPays = {
            currency: currency,
            issuer: request.takerPays.issuer,
            value: request.takerPays.value,
          };
          console.log(
            `[useXrplAccount] TakerPays: ${JSON.stringify(takerPays)}`
          );
        }

        // 플래그 계산
        let flags = 0;
        if (request.passive === true) {
          flags |= 0x00010000; // tfPassive
          console.log("[useXrplAccount] Passive 플래그 설정됨");
        }
        if (request.immediateOrCancel === true) {
          flags |= 0x00020000; // tfImmediateOrCancel
          console.log("[useXrplAccount] ImmediateOrCancel 플래그 설정됨");
        }
        if (request.fillOrKill === true) {
          flags |= 0x00040000; // tfFillOrKill
          console.log("[useXrplAccount] FillOrKill 플래그 설정됨");
        }

        // OfferCreate 트랜잭션 구성
        console.log("[useXrplAccount] OfferCreate 트랜잭션 구성 중...");
        const tx: any = {
          TransactionType: "OfferCreate",
          Account: request.account,
          TakerGets: takerGets,
          TakerPays: takerPays,
          Fee: networkFee,
          LastLedgerSequence: currentLedgerSequence + 20,
          Sequence: sequence,
          Flags: flags,
        };

        // 선택적 필드 추가
        if (request.expiration) {
          tx.Expiration = request.expiration;
          console.log(`[useXrplAccount] 만료 시간 설정: ${request.expiration}`);
        }

        if (request.offerSequence) {
          tx.OfferSequence = request.offerSequence;
          console.log(
            `[useXrplAccount] 대체할 오퍼 시퀀스: ${request.offerSequence}`
          );
        }

        console.log(
          "[useXrplAccount] 트랜잭션 구성 완료",
          JSON.stringify(tx, null, 2)
        );

        // 트랜잭션 제출
        console.log("[useXrplAccount] 트랜잭션 제출 중...");
        const result = await xrplClient.submitAndWait(tx, { wallet });
        console.log(
          "[useXrplAccount] 트랜잭션 제출 결과:",
          JSON.stringify(result, null, 2)
        );

        // 트랜잭션 결과 확인
        const txResult = result.result.meta.TransactionResult;
        console.log(`[useXrplAccount] 트랜잭션 결과 코드: ${txResult}`);

        // 성공적인 트랜잭션 결과 코드 확인
        const isSuccess = txResult === "tesSUCCESS";

        if (isSuccess) {
          console.log(`[useXrplAccount] 오퍼 생성 성공!`);

          // 생성된 오퍼 시퀀스 번호 찾기
          let offerSequence = null;
          try {
            const meta = result.result.meta;
            if (meta.AffectedNodes) {
              for (const node of meta.AffectedNodes) {
                if (
                  node.CreatedNode &&
                  node.CreatedNode.LedgerEntryType === "Offer"
                ) {
                  offerSequence = node.CreatedNode.LedgerIndex.split(":")[2];
                  console.log(
                    `[useXrplAccount] 생성된 오퍼 시퀀스: ${offerSequence}`
                  );
                  break;
                }
              }
            }
          } catch (e) {
            console.warn("[useXrplAccount] 오퍼 시퀀스 추출 실패:", e);
          }

          return {
            success: true,
            result: result,
            account: request.account,
            offerSequence: offerSequence,
            takerGets: request.takerGets,
            takerPays: request.takerPays,
            transactionResult: txResult,
          };
        } else {
          console.error(`[useXrplAccount] 오퍼 생성 실패: ${txResult}`);

          return {
            success: false,
            error: `트랜잭션이 실패했습니다: ${txResult}`,
            transactionResult: txResult,
            result: result,
          };
        }
      } catch (error: any) {
        console.error("[useXrplAccount] 오퍼 생성 중 오류 발생:", error);
        console.error("[useXrplAccount] 오류 메시지:", error?.message);
        console.error(
          "[useXrplAccount] 오류 세부 정보:",
          error?.data || "세부 정보 없음"
        );

        const errorMessage =
          error?.message || "오퍼 생성 중 오류가 발생했습니다.";
        setError(errorMessage);

        return {
          success: false,
          message: errorMessage,
          error: errorMessage,
        };
      } finally {
        if (shouldDisconnect) {
          try {
            const xrplClient = await getXrplClient();
            if (xrplClient && xrplClient.isConnected()) {
              console.log("[useXrplAccount] XRPL 연결 종료 중...");
              await xrplClient.disconnect();
              console.log("[useXrplAccount] XRPL 연결 종료 완료");
            }
          } catch (err) {
            console.error("[useXrplAccount] 연결 종료 중 오류:", err);
          }
        }
        setIsLoading(false);
      }
    },
    [getFeeRecommendation, validateCurrencyCode]
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
    createOffer,
  };
};
