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
import { TransactionDetailProvider } from "./contexts/TransactionDetailContext";
import ScrollToTop from "./components/common/ScrollToTop";
import { getSocketServer } from "./utils/xrpl-client";

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

  // 친구 계정 생성 함수
  const initializeFriends = useCallback(async () => {
    const friends = JSON.parse(localStorage.getItem("friends") || "[]");

    if (friends.length === 0) {
      try {
        const newFriends = [
          {
            nickname: "카이",
            address: "rJkNdbv3UfhFHpYA4Z43MT1kikM4cbzx3N",
            emoji: "😎",
            secret: "sEdVFQdrinmTnE4Crz3qw6NR7Q7rMBg",
          },
          {
            nickname: "리암",
            address: "rNo2tAqkdM7g189BjqV9USZo1PtaM6S27t",
            emoji: "🚀",
            secret: "sEdTk578DYn1tJCrmiePyNG7N1c4mCm",
          },
          {
            nickname: "준",
            address: "rp95ayUo6SkpVQqbGkr4wPK7SgDfUPUXjE",
            emoji: "🔥",
            secret: "sEdV9gPQcPZK6w3x4D7mipFVUbQaBuP",
          },
          {
            nickname: "해리",
            address: "rNsPBkhVGojfDZcZqYk3zX3xrJahYRbA1H",
            emoji: "🌟",
            secret: "sEd77AMoSqSM5ZMcxeivehqESarmo9h",
          },
          {
            nickname: "제이콥",
            address: "rJ9uCtzbGa14NuPYuhPxX1umBFjnzAQxhn",
            emoji: "🎮",
            secret: "sEdTrcU5S9Nv9TznFDgEBKErSHjCfpA",
          },
        ];
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
    const checkWalletExists = async () => {
      const userInfo = localStorage.getItem("userInfo");
      setHasWallet(!!userInfo);

      if (userInfo) {
        const userInfoObj = JSON.parse(userInfo);
        getSocketServer(userInfoObj.address);
      }
    };

    checkWalletExists();
    initializeFriends(); // 친구 목록 초기화
  }, [initializeFriends]);

  return (
    <UIProvider>
      <SpinnerProvider>
        {hasWallet ? (
          <BrowserRouter>
            <ScrollToTop />
            <CryptoPriceProvider>
              <TransactionDetailProvider>
                <SpeechProvider>
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
                </SpeechProvider>
              </TransactionDetailProvider>
            </CryptoPriceProvider>
          </BrowserRouter>
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
