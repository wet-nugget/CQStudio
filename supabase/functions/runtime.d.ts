// Minimal host declarations for offline tsc checks. Deno resolves production
// runtime types itself; imports are pinned in deno.json.
declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};
