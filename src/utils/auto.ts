// Utility Functions

/**
 * 주어진 길이의 랜덤 Uint8Array를 생성합니다.
 * (실제 환경에서는 서버에서 challenge를 생성해야 합니다.)
 */
const generateRandomBuffer = (length: number): Uint8Array => {
  const buffer = new Uint8Array(length);
  window.crypto.getRandomValues(buffer);
  return buffer;
};

/**
 * ArrayBuffer를 Base64 문자열로 변환합니다.
 */
const bufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return window.btoa(binary);
};

// ------------------------------
// Registration Logic
// ------------------------------

interface RegistrationOptions {
  challenge: Uint8Array;
  userId: Uint8Array;
  userName: string;
  displayName: string;
}

/**
 * 사용자를 등록하는 함수
 * @param options - 등록에 필요한 challenge와 사용자 정보
 * @returns 등록에 성공한 PublicKeyCredential 또는 null
 */
const registerCredential = async (
  options: RegistrationOptions
): Promise<PublicKeyCredential | null> => {
  const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions =
    {
      challenge: options.challenge,
      rp: { name: "Demo Service" },
      user: {
        id: options.userId,
        name: options.userName,
        displayName: options.displayName,
      },
      // ES256 알고리즘 예시
      pubKeyCredParams: [{ type: "public-key", alg: -7 }],
      authenticatorSelection: {
        authenticatorAttachment: "platform", // 내장 인증 장치 사용
        userVerification: "required",
      },
      timeout: 60000,
      attestation: "none", // 데모에서는 attestation 검증 생략
    };

  try {
    const credential = (await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions,
    })) as PublicKeyCredential;
    console.log("Registration Success:", credential);
    return credential;
  } catch (error) {
    console.error("Registration Error:", error);
    return null;
  }
};

// ------------------------------
// Authentication Logic
// ------------------------------

/**
 * 등록된 인증 정보(rawId)를 사용해 인증을 진행하는 함수
 * @param storedCredentialRawId - 등록 시 저장한 credential의 rawId (ArrayBuffer)
 * @returns 인증에 성공한 PublicKeyCredential 또는 null
 */
const authenticateCredential = async (
  storedCredentialRawId: ArrayBuffer
): Promise<PublicKeyCredential | null> => {
  const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
    challenge: generateRandomBuffer(32), // 실제 환경에서는 서버에서 challenge 생성
    allowCredentials: [
      {
        type: "public-key",
        id: storedCredentialRawId,
      },
    ],
    timeout: 60000,
    userVerification: "required",
  };

  try {
    const assertion = (await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions,
    })) as PublicKeyCredential;
    console.log("Authentication Success:", assertion);
    return assertion;
  } catch (error) {
    console.error("Authentication Error:", error);
    return null;
  }
};

// ------------------------------
// 예시 사용법
// ------------------------------

// 등록 버튼 클릭 시 호출 (예시)
const handleRegistration = async (
  nickname: string,
  address?: string
): Promise<PublicKeyCredential | null> => {
  // 임의로 생성한 값. 실제 사용 시 서버에서 제공된 challenge를 사용하세요.
  const challenge = generateRandomBuffer(32);

  // address가 있으면 사용, 없으면 임의로 생성
  let userId: Uint8Array;
  if (address) {
    // 주소를 Uint8Array로 변환
    const encoder = new TextEncoder();
    userId = encoder.encode(address);
  } else {
    userId = generateRandomBuffer(16);
  }

  console.log("nickname:", nickname);
  const registrationOptions: RegistrationOptions = {
    challenge,
    userId,
    userName: nickname || "anonymous", // 닉네임 사용
    displayName: nickname || "익명 사용자", // 닉네임 사용
  };

  const credential = await registerCredential(registrationOptions);
  if (credential) {
    // 등록된 credential의 rawId를 base64로 변환하여 저장할 수도 있습니다.
    const rawIdBase64 = bufferToBase64(credential.rawId);
    console.log("등록된 credential rawId(Base64):", rawIdBase64);
    // 이 rawId를 나중에 인증 시 allowCredentials에 사용하세요.
  }

  return credential;
};

// 인증 버튼 클릭 시 호출 (예시)
// handleAuthentication 함수에선 등록 시 저장한 rawId(ArrayBuffer)를 사용합니다.
const handleAuthentication = async (
  storedRawId?: string
): Promise<PublicKeyCredential | null> => {
  if (!storedRawId) {
    console.error("storedRawId가 없습니다.");
    return null;
  }

  // base64 문자열을 ArrayBuffer로 변환
  const rawIdArray = Uint8Array.from(atob(storedRawId), (c) => c.charCodeAt(0));
  const rawIdBuffer = rawIdArray.buffer;

  const assertion = await authenticateCredential(rawIdBuffer);
  if (assertion) {
    console.log("인증 성공, assertion:", assertion);
  }

  return assertion;
};

export { handleRegistration, handleAuthentication };
