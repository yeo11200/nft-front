import React, {
  createContext,
  useContext,
  ReactNode,
  useRef,
  useEffect,
  useCallback,
  useState,
} from "react";
import useSpeechRecognition from "../hooks/useSpeechRecognition";
import { FloatingVoiceUI } from "../components/FloatingVoiceUI";
import { useSpinner } from "./SpinnerContext";
import { playTTS } from "../utils/tts-api";
import {
  generateTextOnClient,
  parseTaskFromResponse,
} from "../services/llm.service";
import { TaskName } from "../types/task/response.dto";
import { useUI } from "./UIContext";
import { useNavigate } from "react-router-dom";
import { useXrplAccount } from "../hooks/useXrplAccount";
import { useTransactionDetail } from "./TransactionDetailContext";
import { handleAuthentication, handleRegistration } from "../utils/auto";
import FriendDetailModal, {
  Friend,
} from "../feat-component/FriendList/components/FriendDetailModal";
import { useTokenInput } from "./TokenInputContext";

type SpeechContextType = {
  transcript: string;
  isActive: boolean;
};

const SpeechContext = createContext<SpeechContextType | undefined>(undefined);

export const SpeechProvider = ({ children }: { children: ReactNode }) => {
  const { showSpinner, hideSpinner } = useSpinner();
  const { toast, confirm } = useUI();
  const navigate = useNavigate();
  const { sendPayment } = useXrplAccount();
  const { openTransactionDetail } = useTransactionDetail();
  const { openTokenInput } = useTokenInput();
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);

  const handleSendPayment = async (
    address: string,
    amount: string,
    message: string
  ) => {
    const userInfoStr = localStorage.getItem("userInfo");
    const accountData = userInfoStr ? JSON.parse(userInfoStr) : null;

    // 생체 인증 지원 여부 확인
    if (!window.PublicKeyCredential) {
      toast("이 브라우저는 생체 인증을 지원하지 않습니다.", "error");
      hideSpinner();
      return false;
    }

    if (!accountData) {
      toast("계정 정보를 찾을 수 없습니다.", "error");
      return;
    }

    const result = await confirm(`송금 하실래요?`, message, {
      confirmText: "송금",
      cancelText: "취소",
      confirmStyle: "primary",
      onConfirmAction: async () => {
        const nickname = localStorage.getItem("userInfo")
          ? JSON.parse(localStorage.getItem("userInfo")!).userId
          : "사용자";

        let autoLogin = localStorage.getItem("autoLogin");

        // 생체 인증 등록 시도
        if (!autoLogin) {
          const credential = await handleRegistration(nickname, address);
          console.log("credential", credential);
          if (!credential) {
            toast("생체 인증 등록에 실패했습니다.", "error");
            return false;
          }

          const autoLoginData = {
            credentialId: credential.id,
            rawId: btoa(
              String.fromCharCode.apply(
                null,
                Array.from(new Uint8Array(credential.rawId))
              )
            ),
          };
          localStorage.setItem("autoLogin", JSON.stringify(autoLoginData));

          autoLogin = JSON.stringify(autoLoginData);
        }

        // 바로 인증 시도
        const authResult = await handleAuthentication(
          JSON.parse(autoLogin!).rawId
        );

        if (authResult) {
          showSpinner("송금 중...");
          const res = await sendPayment({
            fromAddress: accountData.address,
            toAddress: address,
            amount: parseFloat(amount),
            secret: accountData.secret,
          });

          hideSpinner();

          navigate("/transaction-history");
          if (res?.transaction) {
            openTransactionDetail(res.transaction.hash);
          }
        } else {
          queueTTS("생체 인증에 실패했습니다.");
        }
      },
    });
    if (result) {
      console.log("송금 진행");
    }
  };

  // Context API를 통한 팝업 열기
  const handleOpenPopup = (
    currency: string,
    account: string,
    xrpAmount: string,
    tokenAmount: string
  ) => {
    openTokenInput(currency, "🌐", account, xrpAmount, tokenAmount);
  };

  const { transcript, isActive, stop, start } = useSpeechRecognition({
    lang: "ko-KR",
    continuous: true,
    autoStart: false,
    noiseLevel: "noisy",
    onResult: async (result) => {
      console.log("결과 처리 시작:", result);
      showSpinner("결과 처리 중...");

      stop();
      const data = await generateTextOnClient(result).finally(() => {
        hideSpinner();
        setIsOpen(false);
      });

      const taskInfo = parseTaskFromResponse(data.response);

      if (taskInfo) {
        if (taskInfo.statusInfo.status === "success") {
          switch (taskInfo.data.task) {
            case TaskName.GO_TO_MAIN:
              navigate("/");
              break;
            case TaskName.GET_ACCOUNT:
              navigate("/wallet");
              break;
            case TaskName.PAYMENT_XRP:
              if (taskInfo.data.parameters) {
                const params = taskInfo.data.parameters as unknown as {
                  toAddress: string;
                  amount: number;
                  message?: string;
                };

                const status = taskInfo.statusInfo;

                handleSendPayment(
                  params.toAddress,
                  params.amount.toString(),
                  status.message || ""
                );
              }
              break;
            case TaskName.GET_TRANSACTION_HISTORY:
              navigate("/transaction-history");
              break;
            case TaskName.GET_TRANSACTION_DETAIL:
              const params = taskInfo.data.parameters as unknown as {
                txHash: string;
              };
              if (params.txHash) {
                openTransactionDetail(params.txHash);
              } else {
                queueTTS("트랜잭션 해시를 찾을 수 없습니다.");
              }
              break;
            case TaskName.GET_FRIEND_DETAIL:
              const friendParams = taskInfo.data.parameters as unknown as {
                friendAddress: string;
              };
              if (friendParams.friendAddress) {
                handleFriendClick(friendParams.friendAddress);
              }
              break;
            case TaskName.GET_FRIEND_LIST:
              navigate("/friend-list");
              break;
            case TaskName.OPEN_TOKEN_INPUT:
              const tokenParams = taskInfo.data.parameters as unknown as {
                currency: string;
                account: string;
                xrpAmount: string;
                tokenAmount: string;
              };
              if (tokenParams) {
                handleOpenPopup(
                  tokenParams.currency,
                  tokenParams.account,
                  tokenParams.xrpAmount,
                  tokenParams.tokenAmount
                );
              }
              break;
            default:
              queueTTS(taskInfo.statusInfo.message);
              break;
          }
        } else {
          queueTTS(taskInfo.statusInfo.message);
        }
      }
    },
  });

  const ttsQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);

  // TTS 재생 함수
  const playNextTTS = async () => {
    if (isPlayingRef.current || ttsQueueRef.current.length === 0) {
      return;
    }

    try {
      isPlayingRef.current = true;
      const nextText = ttsQueueRef.current.shift()!;

      console.log("TTS 재생 시작:", nextText);
      stop();

      toast(nextText, "error");

      await playTTS(nextText)
        .then(() => {
          console.log("TTS 재생 완료");
        })
        .catch((err) => {
          console.error("TTS 재생 오류:", err);
        });

      console.log("TTS 재생 완료");
    } finally {
      isPlayingRef.current = false;

      // 큐에 더 있으면 다음 재생
      if (ttsQueueRef.current.length > 0) {
        playNextTTS();
      }
    }
  };

  // TTS 큐에 추가
  const queueTTS = (text: string) => {
    if (!text) return;

    ttsQueueRef.current.push(text);
    console.log("TTS 큐에 추가:", text);

    // 재생 중이 아니면 재생 시작
    if (!isPlayingRef.current) {
      playNextTTS();
    }
  };

  const handleClick = useCallback(() => {
    stop();

    start(false);
    setIsOpen(true);
  }, [start, stop]);

  const handleFriendClick = (friendAddress: string) => {
    const friends = JSON.parse(localStorage.getItem("friends") || "[]");

    const friend = friends.find(
      (friend: Friend) => friend.address === friendAddress
    ) as Friend;

    setSelectedFriend(friend);
    setIsModalOpen(true);
  };

  useEffect(() => {
    stop();
  }, [stop]);

  return (
    <SpeechContext.Provider value={{ transcript, isActive }}>
      {children}
      <FloatingVoiceUI
        open={true}
        isActive={isOpen}
        transcript={transcript}
        onClick={handleClick}
      />

      {/* 친구 상세 정보 모달 */}
      {isModalOpen && selectedFriend && (
        <FriendDetailModal
          friend={{
            ...selectedFriend,
            isFavorite: false,
            transactionCount: 0,
          }}
          onClose={() => setIsModalOpen(false)}
          onResult={() => console.log("친구 상세 정보 모달 닫기")}
        />
      )}
    </SpeechContext.Provider>
  );
};

export const useSpeech = () => {
  const context = useContext(SpeechContext);
  if (context === undefined) {
    throw new Error("useSpeech must be used within a SpeechProvider");
  }
  return context;
};
