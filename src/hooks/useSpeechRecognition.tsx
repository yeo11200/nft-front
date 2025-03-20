/**
 * @fileoverview 음성 인식 기능을 제공하는 React 커스텀 훅
 *
 * Web Speech API를 사용하여 음성 인식 기능을 구현합니다.
 * 브라우저의 SpeechRecognition API를 래핑하여 React 친화적인 인터페이스를 제공합니다.
 */
import { useState, useEffect, useRef, useCallback } from "react";

/**
 * 음성 인식 설정 옵션 인터페이스
 * @interface UseSpeechRecognitionOptions
 * @property {string} [lang='ko-KR'] - 인식할 언어 설정 (예: 'ko-KR', 'en-US')
 * @property {boolean} [interimResults=true] - 중간 결과 반환 여부. true일 경우 음성 인식 중간 결과도 반환
 * @property {number} [maxAlternatives=1] - 각 인식 결과에 대한 대체 해석 최대 개수
 * @property {boolean} [continuous=false] - 연속 인식 모드 여부. true일 경우 음성 입력이 끝나도 계속 인식
 */
export type UseSpeechRecognitionOptions = {
  lang?: string;
  interimResults?: boolean;
  maxAlternatives?: number;
  continuous?: boolean;
  autoStart?: boolean;
  onResult?: (result: string) => Promise<void>;
};

/**
 * 음성 인식 훅 반환값 인터페이스
 * @interface UseSpeechRecognitionReturn
 * @property {string} transcript - 인식된 음성 텍스트
 * @property {string[]} transcripts - 인식된 음성 텍스트 배열
 * @property {string | null} error - 발생한 에러 메시지
 * @property {() => void} start - 음성 인식 시작 함수
 * @property {() => void} stop - 음성 인식 중지 함수
 * @property {boolean} isActive - 현재 음성 인식 활성화 상태
 * @property {(text: string) => void} readText - 텍스트를 음성으로 변환하여 읽어주는 함수
 */
export type UseSpeechRecognitionReturn = {
  transcript: string;
  transcripts: string[];
  error: string | null;
  start: (isTtsApi?: boolean) => void;
  stop: () => void;
  isActive: boolean;
  readText: (text: string) => void;
};

/**
 * 음성 인식 커스텀 훅
 *
 * @example
 * ```tsx
 * const { transcript, error, start, stop, isRecognizing } = useSpeechRecognition({
 *   lang: 'ko-KR',
 *   continuous: true
 * });
 * ```
 */
const useSpeechRecognition = ({
  lang = "ko-KR",
  interimResults = true,
  maxAlternatives = 1,
  continuous = false,
  autoStart = true,
  onResult,
}: UseSpeechRecognitionOptions = {}): UseSpeechRecognitionReturn => {
  // Web Speech API 브라우저 지원 확인
  const SpeechRecognition =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;

  // 상태 관리
  const [transcript, setTranscript] = useState<string>(""); // 인식된 텍스트
  const [error, setError] = useState<string | null>(null); // 에러 메시지
  const [transcripts, setTranscripts] = useState<string[]>([]); // 전체 트랜스크립트 배열 상태 추가
  const [isActive, setIsActive] = useState<boolean>(false); // 실제 음성 감지 상태

  // recognition 인스턴스 참조 저장 (리렌더링 간 유지)
  const recognitionRef = useRef<typeof SpeechRecognition | null>(null);
  const isRecognizing = useRef<boolean>(false); // 인식 상태

  // 마지막 음성 감지 시간을 저장하는 ref
  const lastSpeechTimestampRef = useRef<number>(Date.now());
  // 자동 재시작 타이머 ref
  const restartTimerRef = useRef<NodeJS.Timeout>();
  // 무음 감지 타이머 ref (음성이 없는 상태가 지속되는지 체크)
  const silenceTimerRef = useRef<NodeJS.Timeout>();

  const isApiRef = useRef<boolean>(false);

  /**
   * 음성 인식 시작 함수
   * 에러 발생 시 에러 상태 설정
   */
  const start = useCallback((isTtsApi: boolean = false) => {
    try {
      console.log("Starting recognition");
      isApiRef.current = false;
      isRecognizing.current = isTtsApi;
      setTranscripts([]); // 시작할 때 배열 초기화
      recognitionRef.current?.start();
    } catch (e: any) {
      console.error("Start recognition error:", e);
      setError(e.message || String(e));
    }
  }, []);

  /**
   * 음성 인식 중지 함수
   */
  const stop = useCallback(() => {
    isRecognizing.current = false;
    setIsActive(false);
    setTranscript("");
    recognitionRef.current?.stop();
  }, []);

  /**
   * 텍스트를 음성으로 변환하여 읽어주는 함수
   * Web Speech API의 SpeechSynthesis를 사용
   *
   * @param {string} text - 읽어줄 텍스트
   *
   * @example
   * ```tsx
   * readText("안녕하세요"); // "안녕하세요"를 음성으로 출력
   * ```
   *
   * @description
   * 1. 설정된 언어에 맞는 음성을 찾아 사용
   * 2. 음성의 피치와 볼륨을 적절히 조정
   * 3. 언어가 지원되지 않을 경우 기본 음성으로 폴백
   */
  const readText = useCallback(
    (text: string) => {
      new Promise((resolve, reject) => {
        stop();
        // 사용 가능한 모든 음성 목록 가져오기
        const voices = window.speechSynthesis.getVoices();

        // 새로운 발화 인스턴스 생성
        const utterance = new SpeechSynthesisUtterance(text);

        // 언어 설정
        utterance.lang = lang;

        // 설정된 언어에 맞는 음성 찾기
        utterance.voice =
          voices.find(
            (voice) =>
              voice.lang === lang || voice.lang === lang.replace("-", "_")
          ) || voices[0];

        // 음성 특성 설정
        utterance.pitch = 0.7;
        utterance.volume = 0.8;

        // 이벤트 리스너 추가
        utterance.onend = () => {
          console.log("음성 재생 완료");

          start();
          resolve(true);
        };

        utterance.onerror = (event) => {
          console.error("음성 재생 오류:", event);
          reject(event);
        };

        // 음성 재생
        window.speechSynthesis.speak(utterance);
      });
    },
    [lang, start, stop]
  );

  useEffect(() => {
    // 브라우저 지원 확인
    if (!SpeechRecognition) {
      setError("이 브라우저는 SpeechRecognition API를 지원하지 않습니다.");
      return;
    }
    // recognition 인스턴스 생성 및 설정
    const recognition = new SpeechRecognition();
    recognition.lang = lang; // 인식 언어 설정
    recognition.interimResults = interimResults; // 중간 결과 반환 여부
    recognition.maxAlternatives = maxAlternatives; // 대체 결과 개수
    recognition.continuous = true; // 항상 연속 모드로 설정

    /**
     * 음성 인식 시작 이벤트 핸들러
     * 마이크 활성화 및 인식 시작 시 호출
     */
    recognition.onstart = () => {
      console.log("isTtsApi 탐?", isApiRef.current);
      if (!isApiRef.current) {
        setTranscript("");
        setIsActive(false);
        isRecognizing.current = true;
        console.log("Recognition started");

        // 이전 무음 감지 타이머 제거
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
      }
    };

    /**
     * 음성 인식 종료 이벤트 핸들러
     * 인식 종료 또는 stop() 호출 시 실행
     */
    recognition.onend = () => {
      console.log("Recognition ended");
      console.log("isApiRef.current: recognition.onend", isApiRef.current);
      console.log("isRecognizing", isRecognizing.current);
      // 의도적인 중지가 아닐 경우 자동으로 재시작
      if (isRecognizing.current) {
        restartTimerRef.current = setTimeout(() => {
          try {
            isApiRef.current = false;
            recognition.start();
          } catch (e) {
            console.error("Restart failed:", e);
          }
        }, 100); // 100ms 후 재시작
      } else {
        isRecognizing.current = false;
      }
    };

    /**
     * 음성 인식 결과 처리 핸들러
     * @param {SpeechRecognitionEvent} event - 음성 인식 결과 이벤트
     *
     * results[i][0].transcript: 인식된 텍스트
     * results[i][0].confidence: 인식 정확도 (0-1)
     * resultIndex: 현재 처리 중인 결과의 시작 인덱스
     * results.length: 전체 결과 개수
     */
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (!isApiRef.current) {
        console.log("onresult", event);
        console.log("isApiRef.current:recognition.onresult", isApiRef.current);
        let currentTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i][0];
          currentTranscript += result.transcript;

          // 음성이 감지되면 active 상태로 변경
          if (result.confidence > 0) {
            setIsActive(true);
            lastSpeechTimestampRef.current = Date.now();
          }

          if (event.results[i].isFinal && result.transcript.trim()) {
            setTranscripts((prev) => [...prev, result.transcript.trim()]);
          }
        }

        setTranscript(currentTranscript);

        // 무음 감지 타이머 재설정
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }

        silenceTimerRef.current = setTimeout(async () => {
          if (Date.now() - lastSpeechTimestampRef.current > 1000) {
            // 2초 동안 음성이 없으면
            setIsActive(false); // UI 비활성화

            if (onResult && currentTranscript) {
              isApiRef.current = true;
              console.log("API 호출 시작");

              if (onResult) {
                onResult(currentTranscript)
                  .then(() => {
                    console.log("API 호출 완료 (성공)");
                  })
                  .catch((error) => {
                    console.error("API 호출 중 오류:", error);
                  })
                  .finally(() => {
                    recognition.stop();
                  });
              } else {
                isApiRef.current = false;
              }
            }
          }
        }, 1000);
      }
    };

    /**
     * 에러 처리 핸들러
     * 가능한 에러 타입:
     * - 'no-speech': 음성이 감지되지 않음
     * - 'aborted': 사용자가 인식을 중단
     * - 'audio-capture': 마이크 접근 실패
     * - 'network': 네트워크 오류
     * - 'not-allowed': 마이크 권한 거부
     * - 'service-not-allowed': 음성 인식 서비스 사용 불가
     */
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error);

      if (event.error !== "no-speech") {
        // no-speech 에러는 무시
        setError(event.error);
      }
    };

    // ref에 인스턴스 저장
    recognitionRef.current = recognition;

    // 컴포넌트 언마운트 시 정리
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      isRecognizing.current = false;
    };
  }, [
    lang,
    interimResults,
    maxAlternatives,
    continuous,
    SpeechRecognition,
    stop,
  ]);

  // 컴포넌트 마운트 시 자동으로 시작
  useEffect(() => {
    if (autoStart) {
      recognitionRef.current?.start();
    }
  }, [autoStart]);

  return {
    transcript,
    transcripts,
    error,
    start,
    stop,
    isActive,
    readText,
  };
};

export default useSpeechRecognition;
