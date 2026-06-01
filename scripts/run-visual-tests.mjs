import { spawn, spawnSync } from "node:child_process";

const host = "localhost";
const port = 3000;
const baseUrl = `http://${host}:${port}`;

await assertPortIsFree();

const server = spawn(commandName("npm"), ["run", "dev"], {
  cwd: process.cwd(),
  env: process.env,
  shell: process.platform === "win32",
  stdio: ["ignore", "pipe", "pipe"]
});

let serverOutput = "";

server.stdout.on("data", (chunk) => {
  serverOutput += chunk.toString();
});

server.stderr.on("data", (chunk) => {
  serverOutput += chunk.toString();
});

try {
  await waitForServer(server);
  const testExitCode = await runPlaywright();

  process.exitCode = testExitCode;
} finally {
  stopServer(server);
}

// Keeps visual tests from accidentally running against a stale dev server.
async function assertPortIsFree() {
  if (await canReachServer(600)) {
    throw new Error(`${baseUrl} is already responding. Stop the existing dev server before running visual tests.`);
  }
}

// Waits for the freshly started Next dev server and fails with recent logs.
async function waitForServer(serverProcess) {
  const startedAt = Date.now();
  const timeoutMs = 120_000;

  while (Date.now() - startedAt < timeoutMs) {
    if (serverProcess.exitCode !== null) {
      throw new Error(`Visual test dev server exited early with code ${serverProcess.exitCode}.\n${serverOutput}`);
    }

    if (await canReachServer(1_000)) {
      return;
    }
  }

  throw new Error(`Timed out waiting for ${baseUrl}.\n${serverOutput}`);
}

// Checks whether localhost responds without treating network errors as success.
async function canReachServer(timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(baseUrl, { signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

// Runs Playwright without its own webServer block because this script owns the server.
async function runPlaywright() {
  return new Promise((resolve) => {
    const playwright = spawn(commandName("npx"), ["playwright", "test"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NETLY_PLAYWRIGHT_MANAGED_SERVER: "0"
      },
      shell: process.platform === "win32",
      stdio: "inherit"
    });

    playwright.on("exit", (code) => {
      resolve(code ?? 1);
    });
  });
}

// Stops the full server process tree so npm scripts return cleanly on Windows.
function stopServer(serverProcess) {
  if (serverProcess.exitCode !== null || serverProcess.pid === undefined) {
    return;
  }

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(serverProcess.pid), "/t", "/f"], { stdio: "ignore" });
    return;
  }

  serverProcess.kill("SIGTERM");
}

// Resolves npm/npx command shims correctly on Windows.
function commandName(name) {
  return process.platform === "win32" ? `${name}.cmd` : name;
}
