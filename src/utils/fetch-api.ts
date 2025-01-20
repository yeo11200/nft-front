const BASE_URL = process.env.REACT_APP_API_URL;

export type FetchOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: any;
  queryParams?: Record<string, string | number>;
};

const fetchApi = async <T>(
  endpoint: string, // 기존 url 대신 endpoint만 받음
  options: FetchOptions = {}
): Promise<T> => {
  try {
    const {
      method = "GET",
      headers = { "Content-Type": "application/json" },
      body,
      queryParams,
    } = options;

    // Query Params 처리
    const queryString = queryParams
      ? "?" +
        new URLSearchParams(
          Object.entries(queryParams).reduce(
            (acc, [key, value]) => ({
              ...acc,
              [key]: String(value),
            }),
            {}
          )
        ).toString()
      : "";

    // Base URL과 endpoint 결합
    const fullUrl = `${BASE_URL}${endpoint}${queryString}`;

    const response = await fetch(fullUrl, {
      method,
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = (await response.json()) as T;
    return data;
  } catch (error) {
    console.error("Fetch API error:", error);
    throw error;
  }
};

export default fetchApi;
