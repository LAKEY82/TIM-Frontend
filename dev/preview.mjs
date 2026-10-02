/**
 * `npm run dev:preview` — check the UI with no backend and no login.
 * Starts the mock API (dev/mock-api.mjs) and `next dev` with auth disabled.
 * Development only; production builds ignore NEXT_PUBLIC_AUTH_DISABLED.
 */
import { spawn } from "node:child_process";

const API_PORT = process.env.MOCK_API_PORT ?? "4000";
const children = [];

function run(command, args, env) {
  const child = spawn(command, args, { stdio: "inherit", shell: process.platform === "win32", env: { ...process.env, ...env } });
  children.push(child);
  child.on("exit", (code) => {
    for (const other of children) if (other !== child) other.kill();
    process.exit(code ?? 0);
  });
}

run("node", ["dev/mock-api.mjs"], { PORT: API_PORT });
run("npx", ["next", "dev"], {
  NEXT_PUBLIC_AUTH_DISABLED: "true",
  NEXT_PUBLIC_API_URL: `http://localhost:${API_PORT}`,
  // The mock API treats u6 as "me", so task actions show for the preview user.
  NEXT_PUBLIC_PREVIEW_USER_ID: "u6",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    for (const child of children) child.kill();
    process.exit(0);
  });
}
