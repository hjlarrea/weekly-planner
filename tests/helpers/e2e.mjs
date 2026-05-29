import { chromium } from "playwright";
import { ensureDockerAvailable, runCommand, startServer, waitForHttp } from "./process.mjs";

const CHROME_EXECUTABLE_PATH = process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH
  || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

export async function runPlannerFlowSuite(setupVariant) {
  const cleanup = [];
  const variant = await setupVariant({
    onCleanup(task) {
      cleanup.push(task);
    },
  });
  const browser = await chromium.launch({
    executablePath: CHROME_EXECUTABLE_PATH,
    headless: true,
  });

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1400 } });
    await page.addInitScript(() => {
      localStorage.clear();
    });

    await page.goto(variant.baseUrl, { waitUntil: "networkidle" });
    await expectShellState(page, variant);
    await expectPlannerSelectionFlow(page);
    await expectRecurringOccurrenceEditFlow(page);
  } finally {
    await browser.close();
    for (const task of cleanup.reverse()) {
      await task();
    }
  }
}

async function expectShellState(page, variant) {
  await page.locator("#planner-canvas").waitFor();
  await page.waitForFunction((expectedTitle) => document.title === expectedTitle, variant.expectedSiteTitle);

  if (variant.expectHostedMenu) {
    await page.getByRole("heading", { name: variant.expectedSiteTitle }).waitFor();
  } else {
    await page.locator("#shell-topbar").waitFor({ state: "hidden" });
  }
}

async function expectPlannerSelectionFlow(page) {
  await page.getByRole("button", { name: "Limpiar semana" }).click();
  await page.locator("#planner-empty").waitFor();

  const planner = page.locator("#planner-svg");
  await planner.click({ position: { x: 178, y: 276 } });
  await page.getByText("Nuevo bloque seleccionado:", { exact: false }).waitFor();

  await page.locator("#entry-title").fill("Control médico");
  await page.locator("#entry-location").fill("Consultorio");
  await page.getByRole("button", { name: "Guardar bloque" }).click();

  await page.getByRole("cell", { name: "Control médico" }).waitFor();
  await page.getByText("1 bloques esta semana:", { exact: false }).waitFor();

  await page.getByRole("button", { name: "Editar" }).click();
  await page.locator("#entry-title").fill("Control médico actualizado");
  await page.getByRole("button", { name: "Guardar bloque" }).click();

  await page.getByRole("cell", { name: "Control médico actualizado" }).waitFor();
}

async function expectRecurringOccurrenceEditFlow(page) {
  await page.getByRole("button", { name: "Cargar semana demo" }).click();
  await page.getByRole("cell", { name: "Práctica de fútbol Repite Lun, Mié" }).waitFor();

  await page.locator(".planner-edit-title", { hasText: "Práctica de fútbol" }).first().click();
  await page.getByText("Estás editando solo esta ocurrencia", { exact: false }).waitFor();

  await page.locator("#entry-title").fill("Fútbol especial");
  await page.getByRole("button", { name: "Guardar bloque" }).click();

  await page.getByRole("cell", { name: "Fútbol especial" }).waitFor();
  const repeatedRows = page.getByRole("cell", { name: "Práctica de fútbol Repite Mié" });
  await repeatedRows.waitFor();
}

export async function setupSourceVariant(context) {
  const port = 4181;
  const server = await startServer(process.execPath, ["./scripts/serve.mjs"], {
    env: {
      PORT: String(port),
      SITE_NAME: "Planner Source Test",
      SITE_TITLE: "Planner Source Test",
    },
  });
  context.onCleanup(server.stop);
  await waitForHttp(`http://127.0.0.1:${port}/`);
  return {
    baseUrl: `http://127.0.0.1:${port}/`,
    expectedSiteTitle: "Planner Source Test",
    expectHostedMenu: false,
  };
}

export async function setupDistVariant(context) {
  const port = 4182;
  await runCommand(process.execPath, ["./scripts/build.mjs"], {
    env: {
      SITE_NAME: "Planner Dist Test",
      SITE_TITLE: "Planner Dist Test",
      SITE_DESCRIPTION: "Suite dist local",
      SITE_URL: "https://dist.test.example/",
      SITE_MENU_ENABLED: "true",
    },
  });
  const server = await startServer(process.execPath, ["./scripts/serve.mjs", "dist"], {
    env: {
      PORT: String(port),
    },
  });
  context.onCleanup(server.stop);
  await waitForHttp(`http://127.0.0.1:${port}/`);
  return {
    baseUrl: `http://127.0.0.1:${port}/`,
    expectedSiteTitle: "Planner Dist Test",
    expectHostedMenu: true,
  };
}

export async function setupDockerVariant(context) {
  await ensureDockerAvailable();
  await runCommand("docker", ["compose", "down"]);
  context.onCleanup(async () => {
    await runCommand("docker", ["compose", "down"]);
  });

  await runCommand("docker", ["compose", "up", "-d", "--build"], {
    env: {
      SITE_NAME: "Planner Docker Test",
      SITE_MENU_ENABLED: "true",
    },
  });
  await waitForHttp("http://127.0.0.1:4173/");
  return {
    baseUrl: "http://127.0.0.1:4173/",
    expectedSiteTitle: "Planner Docker Test",
    expectHostedMenu: false,
  };
}
