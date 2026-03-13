import * as z from "zod";
import { createTRPCRouter, protectedProcedure } from "../create-context";
import { getDb, genId } from "../db";
import type { SmsReminder } from "@/types/medical";

export const smsRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        type: z.enum(["vaccination", "consultation", "checkup", "custom"]),
        targetPhone: z.string(),
        language: z.enum(["francais", "pular", "malinke", "soussou"]),
        method: z.enum(["sms", "voice"]),
        message: z.string(),
        scheduledDate: z.string(),
        patientName: z.string().optional(),
      })
    )
    .mutation(({ input }) => {
      const db = getDb();
      const id = genId();
      const reminder: SmsReminder = {
        ...input,
        id,
        status: "pending",
      };
      db.smsReminders.push(reminder);
      console.log("[SMS] Reminder created:", id);
      return reminder;
    }),

  list: protectedProcedure.query(() => {
    const db = getDb();
    return db.smsReminders.sort(
      (a, b) =>
        new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
    );
  }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["pending", "sent", "failed"]),
      })
    )
    .mutation(({ input }) => {
      const db = getDb();
      const reminder = db.smsReminders.find((r) => r.id === input.id);
      if (!reminder) throw new Error("Rappel non trouvé");

      reminder.status = input.status;
      return reminder;
    }),
});
