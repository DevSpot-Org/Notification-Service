import type { CorsOptions } from "cors";

const allowedOrigins: string | RegExp | (string | RegExp)[] = [];

const allowedMethods: string[] = ["GET", "POST"];


export const corsOptions: CorsOptions = {
  methods: allowedMethods,
  origin: '*',
};
