import { createTRPCRouter } from "./create-context";
import { authRouter } from "./routes/auth";
import { patientsRouter } from "./routes/patients";
import { maternityRouter } from "./routes/maternity";
import { emergencyRouter } from "./routes/emergency";
import { smsRouter } from "./routes/sms";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  patients: patientsRouter,
  maternity: maternityRouter,
  emergency: emergencyRouter,
  sms: smsRouter,
});

export type AppRouter = typeof appRouter;
