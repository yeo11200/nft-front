import React, { createContext, useContext, ReactNode } from "react";
import useSpeechRecognition from "../hooks/useSpeechRecognition";
import { FloatingVoiceUI } from "../components/FloatingVoiceUI";

type SpeechContextType = {
  transcript: string;
  isActive: boolean;
};

const SpeechContext = createContext<SpeechContextType | undefined>(undefined);

export const SpeechProvider = ({ children }: { children: ReactNode }) => {
  const { transcript, isActive } = useSpeechRecognition({
    lang: "ko-KR",
    continuous: true,
    onResult: (result) => {
      console.log("result", result);
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
