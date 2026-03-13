import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

import type { appRouter } from "@/backend/trpc/app-router";

export type AppRouter = typeof appRouter;
export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
