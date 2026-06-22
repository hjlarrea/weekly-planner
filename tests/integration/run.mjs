import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fetchText, projectRoot, runCommand, startServer, waitForHttp } from "../helpers/process.mjs";

async function main() {
  await testHostedBuildWritesBrandedOutput();
  await testSourceRuntimeServesDynamicConfig();
  await testDistRuntimeServesGeneratedArtifact();
  console.log("Integration tests passed.");
}

async function testHostedBuildWritesBrandedOutput() {
  await runCommand(process.execPath, ["./scripts/build.mjs"], {
    env: {
      SITE_NAME: "Planner Hosted Test",
      SITE_TITLE: "Planner Hosted Test | Semana",
      SITE_DESCRIPTION: "Descripción hosted",
      SITE_URL: "https://planner-hosted.example/",
      SITE_OG_IMAGE: "https://planner-hosted.example/og.png",
      SITE_MENU_ENABLED: "true",
    },
  });

  const [indexHtml, configJs, robotsTxt, sitemapXml, articlePage] = await Promise.all([
    readFile(path.join(projectRoot, "dist/index.html"), "utf8"),
    readFile(path.join(projectRoot, "dist/config.js"), "utf8"),
    readFile(path.join(projectRoot, "dist/robots.txt"), "utf8"),
    readFile(path.join(projectRoot, "dist/sitemap.xml"), "utf8"),
    readFile(path.join(projectRoot, "dist/articulos/index.html"), "utf8"),
  ]);

  assert.match(indexHtml, /Planner Hosted Test \| Semana/);
  assert.match(indexHtml, /property="og:image" content="https:\/\/planner-hosted\.example\/og\.png"/);
  assert.match(configJs, /siteMenuEnabled": true/);
  assert.match(robotsTxt, /Sitemap: https:\/\/planner-hosted\.example\/sitemap\.xml/);
  assert.match(sitemapXml, /https:\/\/planner-hosted\.example\/articulos\//);
  assert.match(articlePage, /Blog/);
}

async function testSourceRuntimeServesDynamicConfig() {
  const port = 4183;
  const server = await startServer(process.execPath, ["./scripts/serve.mjs"], {
    env: {
      PORT: String(port),
      SITE_NAME: "Planner Runtime Test",
      SITE_TITLE: "Planner Runtime Test",
      SITE_MENU_ENABLED: "true",
      SITE_URL: "https://runtime.example/",
    },
  });

  try {
    await waitForHttp(`http://127.0.0.1:${port}/`);

    const [configJs, robotsTxt, sitemapXml, articleLanding] = await Promise.all([
      fetchText(`http://127.0.0.1:${port}/config.js`),
      fetchText(`http://127.0.0.1:${port}/robots.txt`),
      fetchText(`http://127.0.0.1:${port}/sitemap.xml`, {
        validate: (response) => response.ok && response.headers.get("content-type")?.includes("xml"),
      }),
      fetchText(`http://127.0.0.1:${port}/articulos/`),
    ]);

    assert.match(configJs, /Planner Runtime Test/);
    assert.match(configJs, /siteMenuEnabled": true/);
    assert.match(robotsTxt, /Allow: \//);
    assert.match(sitemapXml, /https:\/\/runtime\.example\/articulos\//);
    assert.match(articleLanding, /Blog/);
  } finally {
    await server.stop();
  }
}

async function testDistRuntimeServesGeneratedArtifact() {
  await runCommand(process.execPath, ["./scripts/build.mjs"], {
    env: {
      SITE_NAME: "Planner Dist Runtime",
      SITE_TITLE: "Planner Dist Runtime",
      SITE_MENU_ENABLED: "true",
    },
  });

  const port = 4184;
  const server = await startServer(process.execPath, ["./scripts/serve.mjs", "dist"], {
    env: {
      PORT: String(port),
      SITE_NAME: "Should Not Replace Dist Artifact",
    },
  });

  try {
    await waitForHttp(`http://127.0.0.1:${port}/`);

    const [indexHtml, configJs] = await Promise.all([
      fetchText(`http://127.0.0.1:${port}/`),
      fetchText(`http://127.0.0.1:${port}/config.js`),
    ]);

    assert.match(indexHtml, /Planner Dist Runtime/);
    assert.match(configJs, /Planner Dist Runtime/);
    assert.doesNotMatch(configJs, /Should Not Replace Dist Artifact/);
  } finally {
    await server.stop();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
