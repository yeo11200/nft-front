import React, { createContext, useContext, ReactNode } from "react";
import useSpeechRecognition from "../hooks/useSpeechRecognition";
import { FloatingVoiceUI } from "../components/FloatingVoiceUI";
import { useSpinner } from "./SpinnerContext";

type SpeechContextType = {
  transcript: string;
  isActive: boolean;
};

const SpeechContext = createContext<SpeechContextType | undefined>(undefined);

export const SpeechProvider = ({ children }: { children: ReactNode }) => {
  const { showSpinner, hideSpinner } = useSpinner();

  const { transcript, isActive } = useSpeechRecognition({
    lang: "ko-KR",
    continuous: true,
    onResult: async (result) => {
      console.log("결과 처리 시작:", result);

      showSpinner("결과 처리 중...");

      // Promise를 반환하고 2초 후에 resolve
      return new Promise((resolve) => {
        setTimeout(() => {
          console.log("2초 후 결과 처리 완료:", result);
          hideSpinner();
          resolve(); // 결과와 함께 Promise 해결
        }, 1000);
      });
    },
  });

  return (
    <SpeechContext.Provider value={{ transcript, isActive }}>
      {children}
      <FloatingVoiceUI isActive={isActive} transcript={transcript} />
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
