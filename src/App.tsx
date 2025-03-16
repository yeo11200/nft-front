import React from "react";
import { Route, Routes, BrowserRouter } from "react-router-dom";
import TicketManager from "./feat-component/TicketManager";
import NftAccount from "./feat-component/NftAccount";
import TicketVerifier from "./feat-component/TicketVerifier";
import { SpeechProvider } from "./contexts/SpeechContext";

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

function App() {
  return (
    <SpeechProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<NftAccount />} />
          <Route path="/tickets" element={<TicketManager />} />
          <Route path="/verify" element={<TicketVerifier />} />
        </Routes>
      </BrowserRouter>
    </SpeechProvider>
  );
}

export default App;
