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
import { useXrplAccount } from "./hooks/useXrplAccount";

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

  const { createAccount } = useXrplAccount();

  // 친구 계정 생성 함수
  const initializeFriends = useCallback(async () => {
    const friends = JSON.parse(localStorage.getItem("friends") || "[]");

    if (friends.length === 0) {
      try {
        // 5명의 지정된 친구 닉네임으로 계정 생성
        const friendNames = ["카이", "리암", "준", "해리", "제이콥"];
        const friendEmojis = ["😎", "🚀", "🔥", "🌟", "🎮"];

        const newFriends = await Promise.all(
          friendNames.map(async (name, index) => {
            // createAccount 함수를 사용하여 계정 생성
            const account = await createAccount(name);
            return {
              nickname: name,
              address: account.account?.address || "",
              emoji: friendEmojis[index], // 이모지 추가
              secret: account.account?.secret || "",
            };
          })
        );

        // 로컬 스토리지에 저장
        localStorage.setItem("friends", JSON.stringify(newFriends));
        console.log("친구 계정 생성 완료:", newFriends);
      } catch (error) {
        console.error("친구 계정 생성 오류:", error);
      }
    }
  }, []);

  useEffect(() => {
    // 로컬스토리지에서 지갑 정보 확인
    const checkWalletExists = () => {
      const userInfo = localStorage.getItem("userInfo");
      setHasWallet(!!userInfo);
    };

    checkWalletExists();
    initializeFriends(); // 친구 목록 초기화
  }, [initializeFriends]);

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
