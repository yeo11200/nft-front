import React from "react";
import { Route, Routes, BrowserRouter } from "react-router-dom";
import TicketManager from "./feat-component/TicketManager";
import NftAccount from "./feat-component/NftAccount";
import TicketVerifier from "./feat-component/TicketVerifier";
import Main from "./feat-component/Main";
import Wallet from "./feat-component/Wallet";
import TransactionHistory from "./feat-component/TransactionHistory";
import { UIProvider } from "./contexts/UIContext";
import { SpeechProvider } from "./contexts/SpeechContext";
import { SpinnerProvider } from "./contexts/SpinnerContext";

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
    <UIProvider>
      <SpinnerProvider>
        <SpeechProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Main />} />
              <Route path="/wallet" element={<Wallet />} />
              <Route
                path="/transaction-history"
                element={<TransactionHistory />}
              />
              <Route path="/nft" element={<NftAccount />} />
              <Route path="/tickets" element={<TicketManager />} />
              <Route path="/verify" element={<TicketVerifier />} />
            </Routes>
          </BrowserRouter>
        </SpeechProvider>
      </SpinnerProvider>
    </UIProvider>
  );
}

export default App;
