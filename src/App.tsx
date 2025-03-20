import React, { useCallback, useEffect, useState } from "react";
import { Route, Routes, BrowserRouter, Navigate } from "react-router-dom";
import TicketManager from "./feat-component/TicketManager";
import NftAccount from "./feat-component/NftAccount";
import TicketVerifier from "./feat-component/TicketVerifier";
import Main from "./feat-component/Main";
import Wallet from "./feat-component/Wallet";
import TransactionHistory from "./feat-component/TransactionHistory";
import { UIProvider } from "./contexts/UIContext";
import { SpeechProvider } from "./contexts/SpeechContext";
import { SpinnerProvider } from "./contexts/SpinnerContext";
import { CryptoPriceProvider } from "./contexts/CryptoPriceContext";
import SignUp from "./feat-component/SignUp/SignUp";
import SignUpComplete from "./feat-component/SignUpComplete";
import Header from "./components/Header";

export type AccountResponse = {
  status: string;
  data: {
    account_address: string;
  };
};

export type ErrorResponse = {
  status: string;
  data: {
    code: string;
    message: string;
  };
};

function App() {
  const [hasWallet, setHasWallet] = useState<boolean | null>(
    !!localStorage.getItem("userInfo")
  );

  useEffect(() => {
    // 로컬스토리지에서 지갑 정보 확인
    const checkWalletExists = () => {
      const userInfo = localStorage.getItem("userInfo");
      setHasWallet(!!userInfo);

      const friends = JSON.parse(localStorage.getItem("friends") || "[]");

      if (friends.length === 0) {
        localStorage.setItem(
          "friends",
          JSON.stringify([
            {
              nickname: "블록왕",
              address: "0x1234567890ABCDEF1234567890ABCDEF12345678+1",
            },
            {
              nickname: "체인마스터",
              address: "0x1234567890ABCDEF1234567890ABCDEF12345678+2",
            },
            {
              nickname: "NFT러버",
              address: "0x1234567890ABCDEF1234567890ABCDEF12345678+3",
            },
          ])
        );
      }
    };

    checkWalletExists();
  }, []);

  return (
    <UIProvider>
      <SpinnerProvider>
        {hasWallet ? (
          <SpeechProvider>
            <CryptoPriceProvider>
              <BrowserRouter>
                <Header />
                <Routes>
                  <Route path="/" element={<Main />} />
                  <Route path="/wallet" element={<Wallet />} />
                  <Route
                    path="/transaction-history"
                    element={<TransactionHistory />}
                  />
                  <Route path="/nft" element={<NftAccount />} />
                  <Route path="/tickets" element={<TicketManager />} />
                  <Route path="/verify" element={<TicketVerifier />} />
                </Routes>
              </BrowserRouter>
            </CryptoPriceProvider>
          </SpeechProvider>
        ) : (
          <>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<SignUp />} />
                <Route
                  path="/signup-complete"
                  element={
                    <SignUpComplete
                      onAnimationComplete={() => {
                        setHasWallet(true); // 상태 업데이트
                        // 애니메이션 완료 후 메인 페이지로 이동
                        window.location.href = "/";
                      }}
                    />
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </>
        )}
      </SpinnerProvider>
    </UIProvider>
  );
}

export default App;
