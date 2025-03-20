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
import { generateTextOnClient } from "../services/llm.service";

type SpeechContextType = {
  transcript: string;
  isActive: boolean;
};

const SpeechContext = createContext<SpeechContextType | undefined>(undefined);

export const SpeechProvider = ({ children }: { children: ReactNode }) => {
  const { showSpinner, hideSpinner } = useSpinner();

  const { transcript, isActive, stop, start } = useSpeechRecognition({
    lang: "ko-KR",
    continuous: true,
    autoStart: false,
    onResult: async (result) => {
      console.log("결과 처리 시작:", result);
      showSpinner("결과 처리 중...");

      stop();
      const response = await generateTextOnClient(result).finally(() => {
        hideSpinner();
      });
      if (response?.message) {
        queueTTS(response.message);
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
