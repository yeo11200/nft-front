import { LlmGenerateRequestDto } from "../types/llm/request.dto";
import { LlmGenerateResponseDto } from "../types/llm/response.dto";
import { TaskResponseDto } from "../types/task/response.dto";

const generateTextOnClient = async (
  prompt: string,
  model?: string
): Promise<LlmGenerateResponseDto> => {
  const userInfoStr = localStorage.getItem("userInfo");
  let userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;

  // userInfo에서 secret 속성 제거
  if (userInfo && userInfo.secret) {
    const { secret, balance, ...userInfoWithoutSecret } = userInfo;
    userInfo = userInfoWithoutSecret;
  }

  const friendsData = JSON.parse(localStorage.getItem("friends") || "[]");
  // Filter friends to only include nickname and address
  const friends = friendsData.map(({ nickname, address }) => ({ nickname, address }));

  const requestBody: LlmGenerateRequestDto = {
    prompt,
    model: model ?? "gemma3:27b",
    my: userInfo,
    friends: friends,
  };

  const response = await fetch(`${process.env.REACT_APP_XRP_PRICE_API_KEY}/api/llm/generate`, {
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

/**
 * Parse the LLM response to extract task information
 * @param llmResponse The response from the LLM (string or object)
 * @returns Structured task response
 */
const parseTaskFromResponse = (llmResponse: string | any): TaskResponseDto | null => {
  try {
    // 이미 객체인 경우와 문자열인 경우를 모두 처리
    let parsedResponse;

    console.log("llmResponse", llmResponse);
    
    // 문자열인 경우 JSON.parse
    if (typeof llmResponse === 'string') {
      try {
        parsedResponse = JSON.parse(llmResponse);
      } catch (parseError) {
        console.error('Failed to parse LLM response string:', parseError);
        return null;
      }
    } else if (typeof llmResponse === 'object' && llmResponse !== null) {
      // 이미 객체인 경우 그대로 사용
      parsedResponse = llmResponse;
    } else {
      console.error('LLM response is neither a string nor an object:', typeof llmResponse);
      return null;
    }
    
    // 응답 구조 확인 - response 객체가 있는 경우 (중첩 구조)
    if (parsedResponse.success && parsedResponse.response) {
      // 응답이 중첩 구조인 경우 (success + response 객체)
      return parsedResponse.response as TaskResponseDto;
    }
    
    // 직접 TaskResponseDto 구조인 경우
    if (
      parsedResponse &&
      typeof parsedResponse.statusInfo === 'object' &&
      (parsedResponse.statusInfo.status === 'success' || parsedResponse.statusInfo.status === 'fail') &&
      typeof parsedResponse.statusInfo.message === 'string' &&
      typeof parsedResponse.data === 'object'
    ) {
      return parsedResponse as TaskResponseDto;
    }
    
    console.error('Invalid task response structure:', parsedResponse);
    return null;
  } catch (error) {
    console.error('Error processing LLM response:', error);
    return null;
  }
};

export { generateTextOnClient, parseTaskFromResponse };
