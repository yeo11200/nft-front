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

  ws.onclose = () => {
    console.log("XRPL 소켓 서버 연결 종료");
  };
};
