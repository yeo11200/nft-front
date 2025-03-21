export const fetchTTSAudio = async (
  transcriptText = ""
): Promise<ArrayBuffer> => {
  if (!transcriptText.trim()) {
    return Promise.reject(new Error("텍스트가 비어있습니다."));
  }

  const payload = {
    model_id: "sonic-2",
    transcript: transcriptText,
    voice: {
      mode: "id",
      id: "af6beeea-d732-40b6-8292-73af0035b740",
      __experimental_controls: {
        speed: 0,
        emotion: [],
      },
    },
    output_format: {
      container: "wav",
      encoding: "pcm_f32le",
      sample_rate: 44100,
    },
    language: "ko",
  };

  return fetch("https://api.cartesia.ai/tts/bytes", {
    method: "POST",
    headers: {
      "Cartesia-Version": "2024-06-10",
      "X-API-Key": "sk_car_KRESIOCUNkCFGjCGP0jkX",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }).then((response) => {
    if (!response.ok) {
      throw new Error("네트워크 응답이 올바르지 않습니다.");
    }
    return response.arrayBuffer();
  });
};

export const playTTS = (transcriptText = "") => {
  const payload = {
    model_id: "sonic",
    transcript: transcriptText,
    voice: {
      mode: "id",
      id: "304fdbd8-65e6-40d6-ab78-f9d18b9efdf9",
      __experimental_controls: {
        speed: -0.3,
        emotion: [],
      },
    },
    output_format: {
      container: "wav",
      encoding: "pcm_f32le",
      sample_rate: 44100,
    },
    language: "ko",
  };

  return fetch("https://api.cartesia.ai/tts/bytes", {
    method: "POST",
    headers: {
      "Cartesia-Version": "2024-06-10",
      "X-API-Key": "sk_car_KRESIOCUNkCFGjCGP0jkX",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("네트워크 응답이 올바르지 않습니다.");
      }
      return response.arrayBuffer();
    })
    .then((data) => {
      const blob = new Blob([data], { type: "audio/wav" });
      const url = URL.createObjectURL(blob);
      const audio = document.createElement("audio");
      audio.src = url;
      audio.controls = true;
      document.body.appendChild(audio);

      return new Promise((resolve, reject) => {
        // 재생 종료 시 오디오 요소 제거 및 URL 해제
        audio.addEventListener("ended", () => {
          console.log("음성 재생 완료. 오디오 요소 제거 및 URL 해제.");
          audio.remove();
          URL.revokeObjectURL(url);
          resolve(true);
        });
        audio.addEventListener("error", (err) => {
          reject(err);
        });
        // 소리 재생 시작 (반환된 Promise는 재생 완료 시 resolve됨)
        audio.play().catch((err) => reject(err));
      });
    })
    .catch((error) => {
      console.error("TTS 요청 에러:", error);
    });
};
