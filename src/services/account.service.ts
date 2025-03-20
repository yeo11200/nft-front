import { AccountRequestParamsDto } from "../types/account/request.dto";

import { AccountResponseDto } from "../types/account/response.dto";

const getAccountInfo = async ({
  address,
}: AccountRequestParamsDto): Promise<AccountResponseDto> => {
  const response = await fetch(`/api/accounts/${encodeURIComponent(address)}`, {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error("API 요청 실패");
  }

  const data = await response.json();
  return data as AccountResponseDto;
};

export { getAccountInfo };
