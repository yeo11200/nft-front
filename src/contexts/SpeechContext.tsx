import React, {
  createContext,
  useContext,
  ReactNode,
  useRef,
  useEffect,
  useCallback,
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

  const handleSendPayment = async (
    address: string,
    amount: string,
    message: string
  ) => {
    const userInfoStr = localStorage.getItem("userInfo");
    const accountData = userInfoStr ? JSON.parse(userInfoStr) : null;

    if (!accountData) {
      toast("계정 정보를 찾을 수 없습니다.", "error");
      return;
    }

    const result = await confirm(`송금 하실래요?`, message, {
      confirmText: "송금",
      cancelText: "취소",
      confirmStyle: "primary",
      onConfirmAction: async () => {
        showSpinner("송금 중...");
        const res = await sendPayment({
          fromAddress: accountData.address,
          toAddress: address,
          amount: parseFloat(amount),
          secret: accountData.secret,
        });

        hideSpinner();

        navigate("/transaction-history");
        console.log("result", res);
        if (res?.transaction) {
          openTransactionDetail(res.transaction.hash);
        }
      },
    });
    if (result) {
      console.log("송금 진행");
    }
  };
  const { transcript, isActive, stop, start } = useSpeechRecognition({
    lang: "ko-KR",
    continuous: true,
    autoStart: false,
    onResult: async (result) => {
      console.log("결과 처리 시작:", result);
      showSpinner("결과 처리 중...");

      stop();
      const data = await generateTextOnClient(result).finally(() => {
        hideSpinner();
      });

      const taskInfo = parseTaskFromResponse(data.response);

      if (taskInfo) {
        if (taskInfo.statusInfo.status === "success") {
          switch (taskInfo.data.task) {
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
              openTransactionDetail(params.txHash);
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

      await playTTS(nextText).catch((err) => {
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
  }, [start]);

  useEffect(() => {
    stop();
  }, [stop]);

  console.log("isActive", isActive);
  return (
    <SpeechContext.Provider value={{ transcript, isActive }}>
      {children}
      <FloatingVoiceUI
        isActive={true}
        transcript={transcript}
        onClick={handleClick}
      />
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
