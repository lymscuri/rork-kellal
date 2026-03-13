import { initTRPC, TRPCError } from "@trpc/server";
import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import superjson from "superjson";

export const createContext = async (opts: FetchCreateContextFnOptions) => {
  const authHeader = opts.req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "") || null;

  return {
    req: opts.req,
    token,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.token) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Token d'authentification requis",
    });
  }

  const user = getUserFromToken(ctx.token);
  if (!user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Token invalide ou expiré",
    });
  }

  return next({
    ctx: {
      ...ctx,
      user,
    },
  });
});

function getUserFromToken(token: string) {
  try {
    const decoded = JSON.parse(Buffer.from(token, "base64").toString("utf-8"));
    if (decoded.id && decoded.email && decoded.role) {
      return decoded as {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: "medecin" | "patient";
        phone?: string;
        dossierNumber?: string;
      };
    }
    return null;
  } catch {
    return null;
  }
}
