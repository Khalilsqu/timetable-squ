// C:\Users\kalho\Desktop\github\squ_frontend2\src\components\GlobalErrorSnackbar.tsx
// src/components/layout/GlobalErrorSnackbar.tsx
import { Snackbar, Alert } from "@mui/material";
import { useNotificationStore } from "@/src/stores/notificationStore";

const GlobalErrorSnackbar = () => {
  const { isOpen, message, severity, handleClose } = useNotificationStore();

  return (
    <Snackbar
      open={isOpen}
      onClose={handleClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert onClose={handleClose} severity={severity} sx={{ width: "100%" }}>
        {message}
      </Alert>
    </Snackbar>
  );
};

export default GlobalErrorSnackbar;
