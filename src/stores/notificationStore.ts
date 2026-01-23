// src/stores/notificationStore.ts
import { create } from "zustand";

export type NotificationSeverity = "error" | "warning" | "info" | "success";

type NotificationState = {
  message: string;
  isOpen: boolean;
  severity: NotificationSeverity;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  handleClose: () => void;
};

export const useNotificationStore = create<NotificationState>((set) => ({
  message: "",
  isOpen: false,
  severity: "error",
  showError: (message) => set({ message, isOpen: true, severity: "error" }),
  showWarning: (message) => set({ message, isOpen: true, severity: "warning" }),
  handleClose: () => set({ message: "", isOpen: false, severity: "error" }),
}));
