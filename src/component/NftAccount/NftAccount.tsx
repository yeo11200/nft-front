import React, { useEffect, useState } from "react";
import { v4 as uuid } from "uuid";
import fetchApi from "../../utils/fetch-api";
import localStorageUtil from "../../utils/local-storage";
import { useNavigate, useLocation } from "react-router-dom";

export type AccountResponse = {
  status: string;
  data: {
    account_address: string;
  };
};

export type ErrorResponse = {
  status: string;
  data: {
    code: string;
    message: string;
  };
};

function NftAccount() {
  const [account, setAccount] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, setEventSymbol] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const manageAccount = async (userId: string) => {
    try {
      // 계좌 조회
      const response = await fetchApi<AccountResponse>(`/account/${userId}`, {
        method: "GET",
      });
      const accountId = response.data.account_address;

      setAccount(accountId);
      localStorageUtil.set("account", accountId);
    } catch (err: any) {
      const errorMessage = err.message || "Something went wrong.";
      if (errorMessage) {
        try {
          // 계좌 생성
          const createResponse = await fetchApi<AccountResponse>(
            "/account/create",
            {
              method: "POST",
              body: { user_id: userId },
            }
          );

          const accountId = createResponse.data.account_address;
          setAccount(accountId);
          localStorageUtil.set("account", accountId);
        } catch (createError: any) {
          setError(createError.message);
        }
      } else {
        setError(errorMessage);
      }
    }
  };

  const handleNavigate = () => {
    if (account) {
      navigate("/tickets");
    } else {
      alert("계좌 정보가 없습니다.");
    }
  };

  useEffect(() => {
    let id: string = localStorageUtil.get("uuid") || "";
    if (!id) {
      id = uuid();
      localStorageUtil.set("uuid", id);
    }

    manageAccount(id);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const eventSymbolFromParam = params.get("eventsymbol") || "TEN";

    if (eventSymbolFromParam) {
      // 로컬 스토리지에서 기존 값 가져오기
      const storedEventSymbol = localStorageUtil.get("eventsymbol");

      if (storedEventSymbol !== eventSymbolFromParam) {
        // 기존 값과 다르면 업데이트
        localStorageUtil.set("eventsymbol", eventSymbolFromParam);
        setEventSymbol(eventSymbolFromParam);

        // URL 뒤에 `eventsymbol` 파라미터 유지
        navigate(`${location.pathname}?eventsymbol=${eventSymbolFromParam}`, {
          replace: true,
        });
      }
    }
  }, [location, navigate]);

  return (
    <div className="App">
      <div>
        <h1>NFT 계좌 관리</h1>
        {account ? (
          <div>
            <p>계좌 주소: {account}</p>
            {/* 버튼 추가 */}
            <button onClick={handleNavigate} disabled={!account}>
              티켓 관리로 이동
            </button>
          </div>
        ) : error ? (
          <p style={{ color: "red" }}>에러: {error}</p>
        ) : (
          <p>계좌 정보를 불러오는 중...</p>
        )}
      </div>
    </div>
  );
}

export default NftAccount;
