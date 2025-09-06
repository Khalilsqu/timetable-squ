// src/stores/sessionWelcomeStore.ts
import { create } from "zustand";

// Ephemeral per page load / tab lifecycle; no persistent storage.

interface SessionWelcomeState {
  open: boolean;
  dismissed: boolean;
  init: () => void; // run once on component mount
  dismiss: () => void;
}

export const useSessionWelcomeStore = create<SessionWelcomeState>(
  (set, get) => ({
    open: true, // show immediately on load
    dismissed: false,
    init: () => {
      const { dismissed } = get();
      if (dismissed) set({ open: false });
    },
    dismiss: () => set({ open: false, dismissed: true }),
  })
);
