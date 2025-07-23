// src\main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";

import { QueryCache, QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";

import { useNotificationStore } from "@/src/stores/notificationStore";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // never refetch automatically
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      // keep data fresh “forever”
      staleTime: Infinity,
      // disable retries (if you also want no retrying on error)
      // retry: false,
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      // 2. Get the state setter and call it on error
      // We use `getState()` here because this is outside a React component
      useNotificationStore.getState().showError(error.message);
    },
  }),
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
