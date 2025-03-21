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
 * @param llmResponse The response from the LLM
 * @returns Structured task response
 */
const parseTaskFromResponse = (llmResponse: string): TaskResponseDto | null => {
  try {
    // Try to parse the response as JSON
    const taskResponse = JSON.parse(llmResponse) as TaskResponseDto;
    
    // Validate the structure
    if (
      taskResponse &&
      typeof taskResponse.statusInfo === 'object' &&
      (taskResponse.statusInfo.status === 'success' || taskResponse.statusInfo.status === 'fail') &&
      typeof taskResponse.statusInfo.message === 'string' &&
      typeof taskResponse.data === 'object'
    ) {
      return taskResponse;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to parse LLM response as task:', error);
    return null;
  }
};

export { generateTextOnClient, parseTaskFromResponse };
