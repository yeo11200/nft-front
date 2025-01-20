import React from "react";
import { Route, Routes, BrowserRouter } from "react-router-dom";
import TicketManager from "./component/TicketManager";
import NftAccount from "./component/NftAccount";
import TicketVerifier from "./component/TicketVerifier";

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
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<NftAccount />} />
        <Route path="/tickets" element={<TicketManager />} />
        <Route path="/verify" element={<TicketVerifier />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
