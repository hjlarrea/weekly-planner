import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import path from "node:path";

export const projectRoot = path.resolve(new URL("../..", import.meta.url).pathname);

export async function runCommand(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: projectRoot,
    env: { ...process.env, ...options.env },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  const [code] = await once(child, "close");
  if (code !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}\n${stdout}\n${stderr}`.trim());
  }

  return { stdout, stderr };
}

export async function startServer(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: projectRoot,
    env: { ...process.env, ...options.env },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  const stop = async () => {
    if (child.exitCode !== null) {
      return;
    }

    child.kill("SIGTERM");
    try {
      await Promise.race([once(child, "close"), delay(5000)]);
    } catch {}

    if (child.exitCode === null) {
      child.kill("SIGKILL");
      await once(child, "close");
    }
  };

  return {
    child,
    stop,
    get stdout() {
      return stdout;
    },
    get stderr() {
      return stderr;
    },
  };
}

export async function waitForHttp(url, options = {}) {
  const timeoutMs = options.timeoutMs ?? 20000;
  const intervalMs = options.intervalMs ?? 250;
  const validate = options.validate ?? ((response) => response.ok);
  const deadline = Date.now() + timeoutMs;
  let lastError = null;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (await validate(response)) {
        return response;
      }

      lastError = new Error(`Unexpected response status ${response.status} for ${url}`);
    } catch (error) {
      lastError = error;
    }

    await delay(intervalMs);
  }

  throw new Error(`Timed out waiting for ${url}: ${lastError?.message || "unknown error"}`);
}

export async function fetchText(url, options = {}) {
  const response = await waitForHttp(url, options);
  return response.text();
}

export async function ensureDockerAvailable() {
  const versionResult = await runCommand("docker", ["compose", "version"]);
  assert.match(versionResult.stdout || versionResult.stderr, /docker compose/i);

  try {
    await runCommand("docker", ["info"]);
  } catch (error) {
    throw new Error("Docker is installed but the daemon is not running. Start Docker before running the Docker test variant.");
  }
}
