// src/stores/notificationStore.ts
import { create } from "zustand";

type NotificationState = {
  message: string;
  isOpen: boolean;
  showError: (message: string) => void;
  handleClose: () => void;
};

export const useNotificationStore = create<NotificationState>((set) => ({
  message: "",
  isOpen: false,
  showError: (message) => set({ message, isOpen: true }),
  handleClose: () => set({ message: "", isOpen: false }),
}));

