import { LlmGenerateRequestDto } from "../types/llm/request.dto";
import { LlmGenerateResponseDto } from "../types/llm/response.dto";

const generateTextOnClient = async (
  prompt: string,
  model?: string
): Promise<LlmGenerateResponseDto> => {
  const userInfoStr = localStorage.getItem("userInfo");
  let userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;

  // userInfo에서 secret 속성 제거
  if (userInfo && userInfo.secret) {
    const { secret, ...userInfoWithoutSecret } = userInfo;
    userInfo = userInfoWithoutSecret;
  }

  const friends = JSON.parse(localStorage.getItem("friends") || "[]");

  const requestBody: LlmGenerateRequestDto = {
    prompt,
    model: model ?? "gemma3:27b",
    my: userInfo,
    friends: friends,
  };

  const response = await fetch("/api/llm/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error("LLM API 요청 실패");
  }

  const data = await response.json();
  return data as LlmGenerateResponseDto;
};

export { generateTextOnClient };
