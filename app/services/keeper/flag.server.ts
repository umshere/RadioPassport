/**
 * KEEPER_ASK_ENABLED — the one keeper switch. Default off: the sheet answers
 * from local facts and the free-text box says it can't take questions yet.
 * Public (it reaches the client through the root loader); never a secret.
 */
export function isKeeperAskEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = (env.KEEPER_ASK_ENABLED ?? "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "on" || raw === "yes";
}
