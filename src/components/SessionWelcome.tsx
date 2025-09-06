// src/components/SessionWelcome.tsx (reconstructed)
import { useEffect } from "react";
import {
  Fade,
  Box,
  Paper,
  Stack,
  Typography,
  Alert,
  Button,
  IconButton,
} from "@mui/material";
import { useSessionWelcomeStore } from "@/src/stores/sessionWelcomeStore";
import { useSemesters, useSemesterLastUpdate } from "@/src/lib/queries";
import { useFilterStore } from "@/src/stores/filterStore";

export default function SessionWelcome() {
  const open = useSessionWelcomeStore((s) => s.open);
  const init = useSessionWelcomeStore((s) => s.init);
  const dismiss = useSessionWelcomeStore((s) => s.dismiss);

  const { data: semInfo } = useSemesters();
  const storeSemester = useFilterStore((s) => s.semester);
  const semester = storeSemester || semInfo?.active || "";
  const { data: lastUpdateData } = useSemesterLastUpdate(semester);

  useEffect(() => {
    init();
  }, [init]);
  if (!open) return null;

  return (
    <Fade in={open} timeout={300}>
      <Box
        role="dialog"
        aria-label="disclaimer"
        sx={{
          position: "fixed",
          zIndex: (t) => t.zIndex.modal + 1,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          maxWidth: 480,
          width: "calc(100% - 32px)",
        }}
      >
        <Paper elevation={8} sx={{ p: 2.5, borderRadius: 2 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-start"
            mb={1}
          >
            <Typography variant="h6" fontWeight={600}>
              Disclaimer
            </Typography>
            <IconButton size="small" aria-label="dismiss" onClick={dismiss}>
              ✕
            </IconButton>
          </Stack>
          <Alert severity="info" icon={false} sx={{ borderRadius: 1 }}>
            <Typography variant="body2" sx={{ textAlign: "justify", mb: 1.5 }}>
              This App is not endorsed by or
              connected to SQU. Course details may be outdated or incomplete;
              always verify in the official SIS. Data shown here is not synced
              live with SIS.
              <br />
              <br />
            </Typography>
            {lastUpdateData && (
              <Typography
                variant="caption"
                sx={{ display: "block", textAlign: "right", opacity: 0.75 }}
              >
                Last synced:{" "}
                {lastUpdateData.parsed.toLocaleDateString("en-US", {
                  month: "short",
                  day: "2-digit",
                  year: "numeric",
                })}
              </Typography>
            )}
            <Box mt={1} textAlign="right">
              <Button onClick={dismiss} color="inherit" size="small">
                Dismiss
              </Button>
            </Box>
          </Alert>
        </Paper>
      </Box>
    </Fade>
  );
}
