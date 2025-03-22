import { Client } from "xrpl";

// XRPL 서버 설정
export const xrplConfig = {
  server:
    process.env.REACT_APP_XRPL_SERVER || "wss://s.altnet.rippletest.net:51233", // testnet
  // server: 'wss://xrplcluster.com', // mainnet
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
 * 애플리케이션 종료 시 호출하여 리소스 정리
 */
export const disconnectXrplClient = async (): Promise<void> => {
  if (clientInstance && clientInstance.isConnected()) {
    await clientInstance.disconnect();
    clientInstance = null;
  }
};

/**
 * 체결된 LAT 수량 계산
 * @param {Object} txData - 트랜잭션 데이터
 * @returns {number} 체결된 LAT 수량
 */
function calculateLatExecuted(txData) {
  const meta = txData.meta || {};
  if (meta.TransactionResult !== "tesSUCCESS" || !txData.validated) {
    return 0;
  }

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
 * @param {string} message - 수신된 메시지
 */
function handleMessage(message, account) {
  try {
    const data = JSON.parse(message);

    // 1. 잔액 변경 이벤트 처리 (송금받은 경우만)
    if (data?.engine_result === "tesSUCCESS" && data?.meta?.AffectedNodes) {
      for (const node of data.meta.AffectedNodes) {
        if (
          node.ModifiedNode?.LedgerEntryType === "AccountRoot" &&
          node.ModifiedNode.FinalFields?.Account === account
        ) {
          const fields = node.ModifiedNode.FinalFields;
          const prevFields = node.ModifiedNode.PreviousFields || {};

          if (prevFields.Balance && fields.Balance) {
            const oldBalance = parseInt(prevFields.Balance);
            const newBalance = parseInt(fields.Balance);
            const balanceDiff = (newBalance - oldBalance) / 1000000;

            // 송금받은 경우만 처리 (balanceDiff > 0)
            if (balanceDiff > 0) {
              console.log(
                `계정 ${account}의 잔액이 업데이트되었습니다: ${oldBalance} → ${newBalance} drops`
              );

              // 로컬 스토리지 업데이트
              const userInfo = localStorage.getItem("userInfo");
              if (userInfo) {
                const parsedInfo = JSON.parse(userInfo);
                if (parsedInfo.address === account) {
                  parsedInfo.balance = newBalance;
                  localStorage.setItem("userInfo", JSON.stringify(parsedInfo));

                  // 잔액 업데이트 이벤트
                  window.dispatchEvent(
                    new CustomEvent("xrpl:balanceUpdate", {
                      detail: { address: account, balance: newBalance },
                    })
                  );

                  // 입금 알림 이벤트
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

    // 2. 트랜잭션 이벤트 처리 (LAT 체결 수량 포함)
    if (data.type !== "transaction") return;
    if (data.engine_result !== "tesSUCCESS" || !data.validated) return;

    let isAffected = false;
    let newBalance = "";
    let latAmount = calculateLatExecuted(data);

    // 내 계정에 영향 확인
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

    // 송금받은 경우만 업데이트 (Payment + Destination이 내 계정)
    const isPayment = data.transaction?.TransactionType === "Payment";
    const isIncoming = isPayment && data.transaction.Destination === account;

    if (isAffected && newBalance && isIncoming) {
      console.log(
        `계정 ${account}의 잔액이 업데이트되었습니다: ${newBalance} drops`
      );

      const userInfo = localStorage.getItem("userInfo");
      if (userInfo) {
        const parsedInfo = JSON.parse(userInfo);
        if (parsedInfo.address === account) {
          parsedInfo.balance = newBalance;
          localStorage.setItem("userInfo", JSON.stringify(parsedInfo));

          window.dispatchEvent(
            new CustomEvent("xrpl:balanceUpdate", {
              detail: { address: account, balance: newBalance },
            })
          );

          const amount = data.meta.delivered_amount || data.transaction.Amount;
          window.dispatchEvent(
            new CustomEvent("xrpl:notification", {
              detail: {
                type: "incoming",
                amount: (parseInt(amount) / 1000000).toFixed(6),
                sender: data.transaction.Account,
              },
            })
          );
        }
      }
    }

    // LAT 체결 수량 출력
    if (latAmount > 0) {
      console.log(`체결된 LAT 수량: ${latAmount}`);
    }
  } catch (error) {
    console.error("메시지 처리 오류:", error);
  }
}

/**
 * 주어진 계정에 대한 트랜잭션을 실시간으로 구독하는 WebSocket 연결을 생성합니다.
 * 계정 변경이 감지되면 잔액 업데이트 및 UI 알림 처리
 */
export const getSocketServer = (account: string) => {
  const ws = new WebSocket(xrplConfig.server);

  ws.onopen = () => {
    console.log("XRPL 소켓 서버 연결 성공");

    // 구독 요청 메시지 구성
    const subscriptionRequest = {
      id: 1,
      command: "subscribe",
      accounts: [account], // 이 배열에 여러 계정을 추가할 수도 있습니다.
    };

    // 서버에 구독 요청 전송
    ws.send(JSON.stringify(subscriptionRequest));
    console.log("구독 요청을 보냈습니다:", subscriptionRequest);
  };

  ws.onmessage = (event) => handleMessage(event, account);

  ws.onclose = () => {
    console.log("XRPL 소켓 서버 연결 종료");
    // 연결이 끊어지면 일정 시간 후 재연결 시도
    setTimeout(() => getSocketServer(account), 5000);
  };

  ws.onerror = (error) => {
    console.error("XRPL 소켓 오류:", error);
  };

  return ws;
};
