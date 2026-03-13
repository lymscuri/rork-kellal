import * as z from "zod";
import { createTRPCRouter, protectedProcedure } from "../create-context";
import { getDb, genId } from "../db";
import type { EmergencyAlert, Secourist } from "@/types/medical";

export const emergencyRouter = createTRPCRouter({
  createAlert: protectedProcedure
    .input(
      z.object({
        latitude: z.number(),
        longitude: z.number(),
        description: z.string(),
        urgencyLevel: z.enum(["critique", "grave", "modere"]),
        senderPhone: z.string().optional(),
      })
    )
    .mutation(({ ctx, input }) => {
      const db = getDb();
      const id = genId();
      const alert: EmergencyAlert = {
        id,
        senderId: ctx.user.id,
        senderName: `${ctx.user.firstName} ${ctx.user.lastName}`,
        senderPhone: input.senderPhone,
        latitude: input.latitude,
        longitude: input.longitude,
        description: input.description,
        urgencyLevel: input.urgencyLevel,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.emergencyAlerts.push(alert);
      console.log("[Emergency] Alert created:", id, input.urgencyLevel);
      return alert;
    }),

  getAlerts: protectedProcedure.query(() => {
    const db = getDb();
    return db.emergencyAlerts.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }),

  getActiveAlerts: protectedProcedure.query(() => {
    const db = getDb();
    return db.emergencyAlerts
      .filter((a) => a.status === "active" || a.status === "prise_en_charge")
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }),

  respondToAlert: protectedProcedure
    .input(z.object({ alertId: z.string() }))
    .mutation(({ ctx, input }) => {
      const db = getDb();
      const alert = db.emergencyAlerts.find((a) => a.id === input.alertId);
      if (!alert) throw new Error("Alerte non trouvée");

      alert.status = "prise_en_charge";
      alert.responderId = ctx.user.id;
      alert.responderName = `${ctx.user.firstName} ${ctx.user.lastName}`;
      alert.updatedAt = new Date().toISOString();
      console.log("[Emergency] Alert responded:", input.alertId, "by", ctx.user.id);
      return alert;
    }),

  resolveAlert: protectedProcedure
    .input(z.object({ alertId: z.string() }))
    .mutation(({ input }) => {
      const db = getDb();
      const alert = db.emergencyAlerts.find((a) => a.id === input.alertId);
      if (!alert) throw new Error("Alerte non trouvée");

      alert.status = "resolue";
      alert.updatedAt = new Date().toISOString();
      return alert;
    }),

  registerSecourist: protectedProcedure
    .input(
      z.object({
        phone: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        specialty: z.string().optional(),
      })
    )
    .mutation(({ ctx, input }) => {
      const db = getDb();
      const existing = db.secourists.find((s) => s.id === ctx.user.id);
      if (existing) {
        existing.latitude = input.latitude;
        existing.longitude = input.longitude;
        existing.isAvailable = true;
        existing.lastActive = new Date().toISOString();
        if (input.specialty) existing.specialty = input.specialty;
        return existing;
      }

      const secourist: Secourist = {
        id: ctx.user.id,
        name: `${ctx.user.firstName} ${ctx.user.lastName}`,
        phone: input.phone,
        latitude: input.latitude,
        longitude: input.longitude,
        isAvailable: true,
        specialty: input.specialty,
        lastActive: new Date().toISOString(),
      };
      db.secourists.push(secourist);
      console.log("[Emergency] Secourist registered:", ctx.user.id);
      return secourist;
    }),

  getSecourists: protectedProcedure.query(() => {
    const db = getDb();
    return db.secourists.filter((s) => s.isAvailable);
  }),

  updateSecouristLocation: protectedProcedure
    .input(
      z.object({
        latitude: z.number(),
        longitude: z.number(),
      })
    )
    .mutation(({ ctx, input }) => {
      const db = getDb();
      const secourist = db.secourists.find((s) => s.id === ctx.user.id);
      if (!secourist) throw new Error("Secouriste non trouvé");

      secourist.latitude = input.latitude;
      secourist.longitude = input.longitude;
      secourist.lastActive = new Date().toISOString();
      return secourist;
    }),

  toggleAvailability: protectedProcedure.mutation(({ ctx }) => {
    const db = getDb();
    const secourist = db.secourists.find((s) => s.id === ctx.user.id);
    if (!secourist) throw new Error("Secouriste non trouvé");

    secourist.isAvailable = !secourist.isAvailable;
    secourist.lastActive = new Date().toISOString();
    return secourist;
  }),
});
