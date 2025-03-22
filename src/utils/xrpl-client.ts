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

  ws.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);

      // 트랜잭션 이벤트가 아니면 무시
      if (data.type !== "transaction") {
        return;
      }

      console.log("트랜잭션 이벤트 수신:", data);

      // 성공한 트랜잭션만 처리
      if (data.engine_result !== "tesSUCCESS" || !data.validated) {
        return;
      }

      // 내 계정에 영향을 주는 트랜잭션인지 확인
      let isAffected = false;
      let newBalance = "";

      // meta.AffectedNodes에서 내 계정 정보 찾기
      if (data.meta && data.meta.AffectedNodes) {
        for (const node of data.meta.AffectedNodes) {
          if (
            node.ModifiedNode &&
            node.ModifiedNode.LedgerEntryType === "AccountRoot"
          ) {
            const fields = node.ModifiedNode.FinalFields;

            // 내 계정이 영향을 받았는지 확인
            if (fields && fields.Account === account) {
              isAffected = true;
              newBalance = fields.Balance;
              break;
            }
          }
        }
      }

      // 내 계정에 영향을 준 트랜잭션이면 잔액 업데이트
      if (isAffected && newBalance) {
        console.log(
          `계정 ${account}의 잔액이 업데이트되었습니다: ${newBalance} drops`
        );

        // 로컬 스토리지에서 계정 정보 업데이트
        const userInfo = localStorage.getItem("userInfo");
        if (userInfo) {
          const parsedInfo = JSON.parse(userInfo);
          if (parsedInfo.address === account) {
            parsedInfo.balance = newBalance;
            localStorage.setItem("userInfo", JSON.stringify(parsedInfo));

            // 현재 열려있는 페이지에 잔액 변경 이벤트 발생
            const balanceUpdateEvent = new CustomEvent("xrpl:balanceUpdate", {
              detail: {
                address: account,
                balance: newBalance,
              },
            });
            window.dispatchEvent(balanceUpdateEvent);

            // 트랜잭션 메시지 판별 및 알림
            const isPayment =
              data.transaction &&
              data.transaction.TransactionType === "Payment";
            const amount = isPayment
              ? data.meta.delivered_amount || data.transaction.Amount
              : "0";
            const isIncoming =
              isPayment && data.transaction.Destination === account;
            const isSending = isPayment && data.transaction.Account === account;

            if (isIncoming) {
              // 알림 표시 (실제 UI에서 사용할 수 있도록 이벤트 발생)
              const notificationEvent = new CustomEvent("xrpl:notification", {
                detail: {
                  type: "incoming",
                  amount: (parseInt(amount) / 1000000).toFixed(6),
                  sender: data.transaction.Account,
                },
              });
              window.dispatchEvent(notificationEvent);
            } else if (isSending) {
              // 송금 완료 알림
              const notificationEvent = new CustomEvent("xrpl:notification", {
                detail: {
                  type: "outgoing",
                  amount: (parseInt(amount) / 1000000).toFixed(6),
                  recipient: data.transaction.Destination,
                },
              });
              window.dispatchEvent(notificationEvent);
            }
          }
        }
      }
    } catch (error) {
      console.error("소켓 메시지 처리 중 오류:", error);
    }
  };

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
