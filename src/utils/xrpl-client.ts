import { Client } from "xrpl";

// XRPL 서버 설정
export const xrplConfig = {
  server:
    process.env.REACT_APP_XRPL_SERVER || "wss://s.altnet.rippletest.net:51233", // Testnet
};

// 싱글톤 클라이언트 인스턴스
let clientInstance: Client | null = null;

/**
 * XRPL 클라이언트 인스턴스를 가져오는 함수
 * 이미 연결된 클라이언트가 있으면 재사용하고, 없으면 새로 생성하여 연결
 */
export const getXrplClient = async (): Promise<Client> => {
  if (clientInstance && clientInstance.isConnected()) {
    return clientInstance;
  }

  try {
    const client = new Client(xrplConfig.server);
    await client.connect();
    clientInstance = client;
    return client;
  } catch (error) {
    console.error("XRPL 클라이언트 연결 실패:", error);
    throw new Error("XRPL 네트워크에 연결할 수 없습니다.");
  }
};

/**
 * 클라이언트 연결을 해제하는 함수
 */
export const disconnectXrplClient = async (): Promise<void> => {
  if (clientInstance && clientInstance.isConnected()) {
    await clientInstance.disconnect();
    clientInstance = null;
  }
};

/**
 * 체결된 LAT 수량 계산
 * @param txData - 트랜잭션 데이터
 * @returns 체결된 LAT 수량 (0이면 체결 없음)
 */
function calculateLatExecuted(txData: any): number {
  const meta = txData.meta || {};
  if (meta.TransactionResult !== "tesSUCCESS" || !txData.validated) return 0;

  const affectedNodes = meta.AffectedNodes || [];
  for (const node of affectedNodes) {
    const modifiedNode = node.ModifiedNode || {};
    if (modifiedNode.LedgerEntryType !== "Offer") continue;

    const finalFields = modifiedNode.FinalFields || {};
    const previousFields = modifiedNode.PreviousFields || {};

    const takerGetsFinal = finalFields.TakerGets || {};
    const takerGetsPrev = previousFields.TakerGets || {};
    if (takerGetsFinal.currency === "LAT" && takerGetsPrev.currency === "LAT") {
      const finalValue = parseFloat(takerGetsFinal.value || 0);
      const prevValue = parseFloat(takerGetsPrev.value || 0);
      return prevValue - finalValue > 0 ? prevValue - finalValue : 0;
    }

    const takerPaysFinal = finalFields.TakerPays || {};
    const takerPaysPrev = previousFields.TakerPays || {};
    if (
      typeof takerPaysFinal === "object" &&
      takerPaysFinal.currency === "LAT" &&
      takerPaysPrev.currency === "LAT"
    ) {
      const finalValue = parseFloat(takerPaysFinal.value || 0);
      const prevValue = parseFloat(takerPaysPrev.value || 0);
      return finalValue - prevValue > 0 ? finalValue - prevValue : 0;
    }
  }
  return 0;
}

/**
 * WebSocket 메시지 핸들러
 * XRPL 네트워크로부터 받은 메시지를 처리하는 함수
 * 1. 잔액 변경 이벤트 처리 (XRP 입금)
 * 2. 트랜잭션 이벤트 처리 (LAT 체결)
 * 3. Escrow 관련 트랜잭션 처리
 *
 * @param message - WebSocket에서 수신된 메시지
 * @param account - 감시할 XRPL 계정 주소
 */
function handleMessage(message: any, account: string): void {
  let data: any;
  try {
    data = JSON.parse(message);
  } catch (error) {
    return;
  }

  // 1. 잔액 변경 이벤트 처리 (송금받은 경우만)
  // AffectedNodes를 통해 계정의 잔액 변경을 감지
  if (data?.engine_result === "tesSUCCESS" && data?.meta?.AffectedNodes) {
    for (const node of data.meta.AffectedNodes) {
      // AccountRoot 타입의 노드가 수정되었고, 해당 계정의 것인지 확인
      if (
        node.ModifiedNode?.LedgerEntryType === "AccountRoot" &&
        node.ModifiedNode.FinalFields?.Account === account
      ) {
        const fields = node.ModifiedNode.FinalFields;
        const prevFields = node.ModifiedNode.PreviousFields || {};

        // 이전 잔액과 새로운 잔액이 모두 있는 경우에만 처리
        if (prevFields.Balance && fields.Balance) {
          const oldBalance = parseInt(prevFields.Balance, 10);
          const newBalance = parseInt(fields.Balance, 10);
          const balanceDiff = (newBalance - oldBalance) / 1_000_000; // XRP 단위로 변환 (drops -> XRP)

          // 잔액이 증가한 경우만 처리 (입금)
          if (balanceDiff > 0) {
            console.log(
              `계정 ${account}의 잔액이 업데이트되었습니다: ${oldBalance} → ${newBalance} drops`
            );

            // localStorage의 userInfo 업데이트
            const userInfo = localStorage.getItem("userInfo");
            if (userInfo) {
              const parsedInfo = JSON.parse(userInfo);
              if (parsedInfo.address === account) {
                parsedInfo.balance = newBalance;
                localStorage.setItem("userInfo", JSON.stringify(parsedInfo));

                // 잔액 업데이트 이벤트 발생
                window.dispatchEvent(
                  new CustomEvent("xrpl:balanceUpdate", {
                    detail: { address: account, balance: newBalance },
                  })
                );

                // 입금 알림 이벤트 발생
                window.dispatchEvent(
                  new CustomEvent("xrpl:notification", {
                    detail: {
                      type: "incoming",
                      amount: balanceDiff.toFixed(6),
                      message: `${balanceDiff.toFixed(
                        6
                      )} XRP가 입금되었습니다.`,
                    },
                  })
                );
              }
            }
          }
        }
      }
    }
  }

  // 2. 트랜잭션 이벤트 처리 (LAT 체결 포함)
  // 트랜잭션 타입이 아니거나 실패한 트랜잭션이면 처리하지 않음
  if (data.type !== "transaction") return;
  if (data.engine_result !== "tesSUCCESS" || !data.validated) return;

  let isAffected = false;
  let newBalance = "";
  const latAmount = calculateLatExecuted(data);

  // AffectedNodes를 통해 계정의 잔액 변경 확인
  if (data.meta?.AffectedNodes) {
    for (const node of data.meta.AffectedNodes) {
      if (
        node.ModifiedNode?.LedgerEntryType === "AccountRoot" &&
        node.ModifiedNode.FinalFields?.Account === account
      ) {
        isAffected = true;
        newBalance = node.ModifiedNode.FinalFields.Balance;
        break;
      }
    }
  }

  // Payment 트랜잭션이고 해당 계정이 수신자인지 확인
  const isPayment = data.transaction?.TransactionType === "Payment";
  const isIncoming = isPayment && data.transaction.Destination === account;

  // 계정이 영향을 받고, 잔액이 변경되었으며, 입금 트랜잭션인 경우
  if (isAffected && newBalance && isIncoming) {
    console.log(
      `계정 ${account}의 잔액이 업데이트되었습니다: ${newBalance} drops`
    );

    // localStorage의 userInfo 업데이트
    const userInfo = localStorage.getItem("userInfo");
    if (userInfo) {
      const parsedInfo = JSON.parse(userInfo);
      if (parsedInfo.address === account) {
        parsedInfo.balance = newBalance;
        localStorage.setItem("userInfo", JSON.stringify(parsedInfo));

        // 잔액 업데이트 이벤트 발생
        window.dispatchEvent(
          new CustomEvent("xrpl:balanceUpdate", {
            detail: { address: account, balance: newBalance },
          })
        );

        // 입금 알림 이벤트 발생 (송신자 정보 포함)
        const amount = data.meta.delivered_amount || data.transaction.Amount;
        window.dispatchEvent(
          new CustomEvent("xrpl:notification", {
            detail: {
              type: "incoming",
              amount: (parseInt(amount, 10) / 1_000_000).toFixed(6),
              sender: data.transaction.Account,
            },
          })
        );
      }
    }
  }

  // LAT 체결이 있는 경우 로그 출력
  if (latAmount > 0) {
    console.log(`체결된 LAT 수량: ${latAmount}`);
  }

  // 3. Escrow 관련 트랜잭션 처리
  // EscrowFinish, EscrowCancel, EscrowCreate 트랜잭션 감지
  const tx = data.transaction;
  if (
    tx.TransactionType === "EscrowFinish" ||
    tx.TransactionType === "EscrowCancel" ||
    tx.TransactionType === "EscrowCreate"
  ) {
    if (account) {
      // fetchTransactionHistory(account);
    }
  }
}

/**
 * 주어진 계정에 대한 트랜잭션을 실시간으로 구독하는 WebSocket 연결을 생성
 * @param account - 감시할 XRPL 계정 주소
 * @returns WebSocket 인스턴스
 */
export const getSocketServer = (account: string): WebSocket => {
  const ws = new WebSocket(xrplConfig.server);

  ws.onopen = () => {
    console.log("XRPL 소켓 서버 연결 성공");

    const subscriptionRequest = {
      id: 1,
      command: "subscribe",
      streams: ["transactions"], // 전체 트랜잭션 스트림
      accounts: [account], // 특정 계정 감시
    };

    ws.send(JSON.stringify(subscriptionRequest));
    console.log("구독 요청 전송:", subscriptionRequest);
  };

  ws.onmessage = (event) => handleMessage(event, account);

  ws.onclose = () => {
    console.log("XRPL 소켓 서버 연결 종료");
    // 5초 후 재연결 시도
  };

  ws.onerror = (error) => {
    console.error("XRPL 소켓 오류:", error);
  };

  return ws;
};

/**
 * WebSocket 연결 해제
 * @param ws - WebSocket 인스턴스
 */
export const closeSocketServer = (ws: WebSocket): void => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.close();
  }
};
