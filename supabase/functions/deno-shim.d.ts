/** Minimal Deno globals for IDE typecheck (runtime is Supabase Edge / Deno). */
declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};
