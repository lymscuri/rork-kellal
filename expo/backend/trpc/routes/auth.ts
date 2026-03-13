import * as z from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../create-context";
import { getDb, genId, hashPassword, verifyPassword, createToken } from "../db";

export const authRouter = createTRPCRouter({
  signup: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(6),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        phone: z.string().optional(),
        role: z.enum(["medecin", "patient"]),
      })
    )
    .mutation(({ input }) => {
      const db = getDb();

      const existing = db.users.find(
        (u) => u.email.toLowerCase() === input.email.toLowerCase()
      );
      if (existing) {
        throw new Error("Cet email est déjà utilisé");
      }

      const id = genId();
      const dossierNumber =
        input.role === "patient"
          ? `KNY-${new Date().getFullYear()}-${Math.floor(Math.random() * 99999).toString().padStart(5, "0")}`
          : undefined;

      const user = {
        id,
        email: input.email.toLowerCase(),
        passwordHash: hashPassword(input.password),
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        role: input.role,
        dossierNumber,
        createdAt: new Date().toISOString(),
      };

      db.users.push(user);
      console.log("[Auth] User created:", user.email, "role:", user.role);

      const token = createToken(user);

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: user.role,
          dossierNumber: user.dossierNumber,
        },
      };
    }),

  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      })
    )
    .mutation(({ input }) => {
      const db = getDb();

      const user = db.users.find(
        (u) => u.email.toLowerCase() === input.email.toLowerCase()
      );

      if (!user || !verifyPassword(input.password, user.passwordHash)) {
        throw new Error("Email ou mot de passe incorrect");
      }

      console.log("[Auth] Login successful:", user.email);
      const token = createToken(user);

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: user.role,
          dossierNumber: user.dossierNumber,
        },
      };
    }),

  getProfile: protectedProcedure.query(({ ctx }) => {
    return ctx.user;
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        phone: z.string().optional(),
      })
    )
    .mutation(({ ctx, input }) => {
      const db = getDb();
      const user = db.users.find((u) => u.id === ctx.user.id);
      if (!user) throw new Error("Utilisateur non trouvé");

      if (input.firstName) user.firstName = input.firstName;
      if (input.lastName) user.lastName = input.lastName;
      if (input.phone) user.phone = input.phone;

      console.log("[Auth] Profile updated:", user.email);

      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        dossierNumber: user.dossierNumber,
      };
    }),

  findPatientByEmail: protectedProcedure
    .input(z.object({ email: z.string().email() }))
    .query(({ input }) => {
      const db = getDb();
      const user = db.users.find(
        (u) =>
          u.email.toLowerCase() === input.email.toLowerCase() &&
          u.role === "patient"
      );
      if (!user) return null;
      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        dossierNumber: user.dossierNumber,
      };
    }),

  findPatientByPhone: protectedProcedure
    .input(z.object({ phone: z.string() }))
    .query(({ input }) => {
      const db = getDb();
      const user = db.users.find(
        (u) => u.phone === input.phone && u.role === "patient"
      );
      if (!user) return null;
      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        dossierNumber: user.dossierNumber,
      };
    }),
});
