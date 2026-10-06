import { describe, it, beforeAll, beforeEach, afterAll, expect } from "vitest";
import { chromium } from "playwright";
import { createServer } from "vite";

// These tests exercise real page navigation (reloads, history, cross-origin
// links), so they drive a real browser with Playwright against a Vite server.
const PORT = 20000 + Math.floor(Math.random() * 20000);
const ORIGIN = `http://localhost:${PORT}`;

let browser;
let page;
let server;

describe("spa-router", () => {
  beforeAll(async () => {
    server = await createServer({
      configFile: false,
      root: process.cwd(),
      logLevel: "silent",
      server: { port: PORT, strictPort: true, hmr: false },
    });
    await server.listen();
    browser = await chromium.launch();
    page = await browser.newPage();
  });

  beforeEach(async () => {
    await page.goto(`${ORIGIN}/test/test.html`, {
      waitUntil: "networkidle",
    });
  });

  describe(`router`, () => {
    it("should do nothing if navigation is not intercepted", async () => {
      await page.evaluate(() => {
        window.router.addEventListener(window.ROUTE_CHANGED, () => {
          window.routeChanged = true;
        });
      });

      await page.click("text=queryLink");

      const routeChanged = await page.evaluate(() => {
        return window.routeChanged;
      });

      expect(routeChanged).toBeUndefined();
      expect(page.url()).toBe(`${ORIGIN}/test/test.html?thing=value`);
    });

    it("should fire event if navigate is called", async () => {
      await page.evaluate(() => {
        window.interceptNavigation();
        window.router.addEventListener(window.ROUTE_CHANGED, () => {
          window.routeChanged = true;
        });
        window.navigate("/test/test.html?thing=value");
      });

      const routeChanged = await page.evaluate(() => {
        return window.routeChanged;
      });

      expect(routeChanged).toBe(true);
      expect(page.url()).toBe(`${ORIGIN}/test/test.html?thing=value`);
    });

    it("should fire event if a link is clicked", async () => {
      await page.evaluate(() => {
        window.interceptNavigation();
        window.router.addEventListener(window.ROUTE_CHANGED, () => {
          window.routeChanged = true;
        });
      });

      await page.click("text=queryLink");

      const routeChanged = await page.evaluate(() => {
        return window.routeChanged;
      });

      expect(routeChanged).toBe(true);
    });

    it("should not fire event on pushstate", async () => {
      await page.evaluate(() => {
        window.interceptNavigation();
        window.router.addEventListener(window.ROUTE_CHANGED, () => {
          window.routeChanged = true;
        });
        window.history.pushState({}, "", "/test/test.html?thing=value");
      });

      expect(await page.url()).toBe(`${ORIGIN}/test/test.html?thing=value`);

      const routeChanged = await page.evaluate(() => {
        return window.routeChanged;
      });
      expect(routeChanged).toBeUndefined();
    });

    it("should fire event on popstate", async () => {
      await page.evaluate(() => {
        window.interceptNavigation();
        window.history.pushState({}, "", "/test/test.html?thing=value");
      });

      expect(await page.url()).toBe(`${ORIGIN}/test/test.html?thing=value`);

      await page.evaluate(() => {
        window.router.addEventListener(window.ROUTE_CHANGED, () => {
          window.routeChanged = true;
        });
      });

      await page.goBack();
      const routeChanged = await page.evaluate(() => {
        return window.routeChanged;
      });

      expect(await page.url()).toBe(`${ORIGIN}/test/test.html`);
      expect(routeChanged).toBe(true);
    });

    describe(`router.path`, () => {
      it("should equal currentPath()", async () => {
        //
        let path = await page.evaluate(() => window.router.path);
        let currentPath = await page.evaluate(() => window.currentPath());
        expect(path).not.toBe("");
        expect(path).toBe(currentPath);
      });
    });

    describe(`router.query`, () => {
      it("should equal currentQuery()", async () => {
        await page.evaluate(() => {
          window.interceptNavigation();
        });
        await page.click("text=queryLink");
        let query = await page.evaluate(() => window.router.query);
        let currentQuery = await page.evaluate(() => window.currentQuery());
        expect(query).not.toBe("");
        expect(query).toBe(currentQuery);
      });
    });

    describe(`router.hash`, () => {
      it("should equal currentHash()", async () => {
        await page.evaluate(() => {
          window.interceptNavigation();
        });
        await page.click("text=hashLink");
        let hash = await page.evaluate(() => window.router.hash);
        let currentHash = await page.evaluate(() => window.currentHash());
        expect(hash).not.toBe("");
        expect(hash).toBe(currentHash);
      });
    });
  });

  describe(`interceptNavigation`, () => {
    it("should not intercept navigation before being activated", async () => {
      await page.click("text=internalLink");
      expect(await page.evaluate(() => window.clicked)).toBeUndefined();
      expect(await page.url()).toBe(`${ORIGIN}/some/internal/link`);
    });

    it("should not intercept cross domain links", async () => {
      await page.evaluate(() => {
        window.interceptNavigation();
      });

      await page.click("text=crossDomainLink");
      expect(await page.evaluate(() => window.clicked)).toBeUndefined();
      expect(await page.url()).toBe("http://example.com/");
    });

    it("should intercept all same domain links by default", async () => {
      await page.evaluate(() => {
        window.interceptNavigation();
      });
      await page.click("text=internalLink");
      expect(await page.evaluate(() => window.clicked)).toBe(true);
      expect(await page.url()).toBe(`${ORIGIN}/some/internal/link`);
    });

    it("should not intercept links that are exluded", async () => {
      await page.evaluate(() => {
        window.interceptNavigation({ exclude: [/\/internal\/link/] });
      });
      await page.click("text=internalLink");
      expect(await page.evaluate(() => window.clicked)).toBeUndefined();
      expect(await page.url()).toBe(`${ORIGIN}/some/internal/link`);
    });

    it("should not intercept links that are not included", async () => {
      await page.evaluate(() => {
        window.interceptNavigation({ include: [/\/some\/other\/link/] });
      });
      await page.click("text=internalLink");
      expect(await page.evaluate(() => window.clicked)).toBeUndefined();
      expect(await page.url()).toBe(`${ORIGIN}/some/internal/link`);
    });

    it("should not intercept links that are included but also excluded", async () => {
      await page.evaluate(() => {
        window.interceptNavigation({
          include: [/\/link/],
          exclude: [/\/internal\/link/],
        });
      });
      await page.click("text=internalLink");
      expect(await page.evaluate(() => window.clicked)).toBeUndefined();
      expect(await page.url()).toBe(`${ORIGIN}/some/internal/link`);
    });

    it("should intercept links that are included", async () => {
      await page.evaluate(() => {
        window.interceptNavigation({ include: [/\/link/] });
      });
      await page.click("text=internalLink");
      expect(await page.evaluate(() => window.clicked)).toBe(true);
      expect(await page.url()).toBe(`${ORIGIN}/some/internal/link`);
    });

    it("should intercept links that are included and not excluded", async () => {
      await page.evaluate(() => {
        window.interceptNavigation({
          include: [/\/link/],
          exclude: [/\/other\/internal\/link/],
        });
      });
      await page.click("text=internalLink");
      expect(await page.evaluate(() => window.clicked)).toBe(true);
      expect(await page.url()).toBe(`${ORIGIN}/some/internal/link`);
    });
  });

  describe(`navigate`, () => {
    it("should navigate to external urls", async () => {
      await page.evaluate(() => window.navigate("http://example.com/"));
      await page.waitForURL("http://example.com/");
      expect(await page.url()).toBe("http://example.com/");
    });
    it("should reload when navigating to local urls if navigation is not intercepted", async () => {
      await page.evaluate(() => {
        window.samePage = true;
        window.navigate("/some/internal/link");
      });
      await page.waitForURL(`${ORIGIN}/some/internal/link`);
      expect(await page.evaluate(() => window.samePage)).toBeUndefined();
      expect(await page.url()).toBe(`${ORIGIN}/some/internal/link`);
    });
    it("should not reload when navigating to local urls if navigation is intercepted", async () => {
      await page.evaluate(() => {
        window.interceptNavigation();
        window.samePage = true;
        window.navigate("/some/internal/link");
      });
      expect(await page.evaluate(() => window.samePage)).toBe(true);
      expect(await page.url()).toBe(`${ORIGIN}/some/internal/link`);
    });
  });

  describe(`currentPath`, () => {
    it("should equal the path of the current location", async () => {
      let path = await page.evaluate(() => window.currentPath());
      expect(path).toBe("/test/test.html");
    });
  });

  describe(`currentQuery`, () => {
    it("should be empty when there is no query parameter", async () => {
      let query = await page.evaluate(() => window.currentQuery());
      expect(query).toBe("");
    });
    it("should equal the query of the current location", async () => {
      await page.evaluate(() => {
        window.interceptNavigation();
      });
      await page.click("text=queryLink");
      let query = await page.evaluate(() => window.currentQuery());
      expect(query).toBe("thing=value");
    });
  });

  describe(`currentHash`, () => {
    it("should be empty when there is no hash", async () => {
      let hash = await page.evaluate(() => window.currentHash());
      expect(hash).toBe("");
    });
    it("should equal the hash of the current location", async () => {
      await page.evaluate(() => {
        window.interceptNavigation();
      });
      await page.click("text=hashLink");
      let hash = await page.evaluate(() => window.currentHash());
      expect(hash).toBe("test");
    });
  });

  afterAll(async () => {
    await browser?.close();
    await server?.close();
  });
});
