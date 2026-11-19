// Generates a VAPID key pair for Web Push and writes it to .env.local (never commit real keys).
// Fills empty placeholders in place; leaves existing non-empty keys untouched.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { generateVAPIDKeys } from "web-push";

const file = process.argv[2] ?? ".env.local";
let env = existsSync(file) ? readFileSync(file, "utf8") : "";
const valueOf = (name) => env.match(new RegExp(`^${name}=(.*)$`, "m"))?.[1]?.trim().replace(/^["']|["']$/g, "") ?? "";

if (valueOf("NEXT_PUBLIC_VAPID_PUBLIC_KEY") && valueOf("VAPID_PRIVATE_KEY")) {
  console.log(`${file} already has VAPID keys — nothing to do.`);
} else {
  const { publicKey, privateKey } = generateVAPIDKeys();
  const set = (name, value) => {
    const line = `${name}="${value}"`;
    env = new RegExp(`^${name}=.*$`, "m").test(env) ? env.replace(new RegExp(`^${name}=.*$`, "m"), line) : `${env.trimEnd()}\n${line}\n`;
  };
  set("NEXT_PUBLIC_VAPID_PUBLIC_KEY", publicKey);
  set("VAPID_PRIVATE_KEY", privateKey);
  writeFileSync(file, env);
  console.log(`Wrote a VAPID key pair to ${file}. Add the same two variables in your hosting provider for production.`);
}
