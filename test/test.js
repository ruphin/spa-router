const { expect } = require("chai");

const { chromium } = require("playwright");

const { HTTPServer } = require("http-server");

let browser;
let page;
let server;

describe("spa-router", async () => {
  before(async () => {
    server = new HTTPServer({ root: "./" });
    server.listen(5000);
    browser = await chromium.launch();
    page = await browser.newPage();
  });

  beforeEach(async () => {
    await page.goto("http://localhost:5000/test/test.html", {
      waitUntil: "networkidle",
    });
  });

  describe(`router`, () => {
    it("should do nothing if navigation is not intercepted", async () => {
      await page.evaluate(() => {
        window.routeChanged = false;
        window.router.addEventListener(window.ROUTE_CHANGED, () => {
          window.routeChanged = true;
        });
      });

      await page.click("text=hashLink");

      const routeChanged = await page.evaluate(() => {
        return window.routeChanged;
      });

      expect(routeChanged).to.be.false;
      expect(page.url()).to.equal("http://localhost:5000/test/test.html#test");
    });

    it("should fire callback if navigation is intercepted", async () => {
      await page.evaluate(() => {
        window.interceptNavigation();
        window.routeChanged = false;
        window.router.addEventListener(window.ROUTE_CHANGED, () => {
          window.routeChanged = true;
        });
      });

      await page.click("text=hashLink");

      const routeChanged = await page.evaluate(() => {
        return window.routeChanged;
      });

      expect(routeChanged).to.be.true;
    });

    it("should fire callback upon location-changed", async () => {
      await page.evaluate(() => {
        window.interceptNavigation();
        window.routeChanged = false;
        window.router.addEventListener(window.ROUTE_CHANGED, () => {
          window.routeChanged = true;
        });
        window.dispatchEvent(new Event("location-changed"));
      });

      await page.click("text=hashLink");

      const routeChanged = await page.evaluate(() => {
        return window.routeChanged;
      });

      expect(routeChanged).to.be.true;
    });

    it("should fire callback upon popstate", async () => {
      await page.evaluate(() => {
        window.interceptNavigation();
        window.routeChanged = false;
        window.router.addEventListener(window.ROUTE_CHANGED, () => {
          window.routeChanged = true;
        });
        window.history.pushState({}, "test", "#test");
      });

      expect(await page.url()).to.equal(
        "http://localhost:5000/test/test.html#test"
      );

      await page.goBack();
      const routeChanged = await page.evaluate(() => {
        return window.routeChanged;
      });

      expect(await page.url()).to.equal("http://localhost:5000/test/test.html");
      expect(routeChanged).to.be.true;
    });

    describe(`router.path`, () => {
      it("should equal currentPath()", async () => {
        //
        let path = await page.evaluate(() => window.router.path);
        let currentPath = await page.evaluate(() => window.currentPath());
        expect(path).to.not.equal("");
        expect(path).to.equal(currentPath);
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
        expect(query).to.not.equal("");
        expect(query).to.equal(currentQuery);
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
        expect(hash).to.not.equal("");
        expect(hash).to.equal(currentHash);
      });
    });
  });

  describe(`interceptNavigation`, () => {
    it("should not intercept navigation before being activated", async () => {
      await page.click("text=internalLink");
      expect(await page.evaluate(() => window.clicked)).to.be.undefined;
      expect(await page.url()).to.equal(
        "http://localhost:5000/some/internal/link"
      );
    });

    it("should not intercept cross domain links", async () => {
      await page.evaluate(() => {
        window.interceptNavigation();
      });

      await page.click("text=crossDomainLink");
      expect(await page.evaluate(() => window.clicked)).to.be.undefined;
      expect(await page.url()).to.equal("http://example.com/");
    });

    it("should intercept all same domain links by default", async () => {
      await page.evaluate(() => {
        window.interceptNavigation();
      });
      await page.click("text=internalLink");
      expect(await page.evaluate(() => window.clicked)).to.be.true;
      expect(await page.url()).to.equal(
        "http://localhost:5000/some/internal/link"
      );
    });

    it("should not intercept links that are exluded", async () => {
      await page.evaluate(() => {
        window.interceptNavigation({ exclude: [/\/internal\/link/] });
      });
      await page.click("text=internalLink");
      expect(await page.evaluate(() => window.clicked)).to.be.undefined;
      expect(await page.url()).to.equal(
        "http://localhost:5000/some/internal/link"
      );
    });

    it("should not intercept links that are not included", async () => {
      await page.evaluate(() => {
        window.interceptNavigation({ include: [/\/some\/other\/link/] });
      });
      await page.click("text=internalLink");
      expect(await page.evaluate(() => window.clicked)).to.be.undefined;
      expect(await page.url()).to.equal(
        "http://localhost:5000/some/internal/link"
      );
    });

    it("should not intercept links that are included but also excluded", async () => {
      await page.evaluate(() => {
        window.interceptNavigation({
          include: [/\/link/],
          exclude: [/\/internal\/link/],
        });
      });
      await page.click("text=internalLink");
      expect(await page.evaluate(() => window.clicked)).to.be.undefined;
      expect(await page.url()).to.equal(
        "http://localhost:5000/some/internal/link"
      );
    });

    it("should intercept links that are included", async () => {
      await page.evaluate(() => {
        window.interceptNavigation({ include: [/\/link/] });
      });
      await page.click("text=internalLink");
      expect(await page.evaluate(() => window.clicked)).to.be.true;
      expect(await page.url()).to.equal(
        "http://localhost:5000/some/internal/link"
      );
    });

    it("should intercept links that are included and not excluded", async () => {
      await page.evaluate(() => {
        window.interceptNavigation({
          include: [/\/link/],
          exclude: [/\/other\/internal\/link/],
        });
      });
      await page.click("text=internalLink");
      expect(await page.evaluate(() => window.clicked)).to.be.true;
      expect(await page.url()).to.equal(
        "http://localhost:5000/some/internal/link"
      );
    });
  });

  describe(`navigate`, () => {
    it("should navigate to external urls", async () => {
      await page.evaluate(() => window.navigate("http://example.com/"));
      expect(await page.url()).to.equal("http://example.com/");
    });
    it("should reload when navigating to local urls if navigation is not intercepted", async () => {
      await page.evaluate(() => {
        window.samePage = true;
        window.navigate("/some/internal/link");
      });
      expect(await page.evaluate(() => window.samePage)).to.be.undefined;
      expect(await page.url()).to.equal(
        "http://localhost:5000/some/internal/link"
      );
    });
    it("should not reload when navigating to local urls if navigation is intercepted", async () => {
      await page.evaluate(() => {
        window.interceptNavigation();
        window.samePage = true;
        window.navigate("/some/internal/link");
      });
      expect(await page.evaluate(() => window.samePage)).to.be.true;
      expect(await page.url()).to.equal(
        "http://localhost:5000/some/internal/link"
      );
    });
  });

  describe(`currentPath`, () => {
    it("should equal the path of the current location", async () => {
      let path = await page.evaluate(() => window.currentPath());
      expect(path).to.equal("/test/test.html");
    });
  });

  describe(`currentQuery`, () => {
    it("should be empty when there is no query parameter", async () => {
      let query = await page.evaluate(() => window.currentQuery());
      expect(query).to.equal("");
    });
    it("should equal the query of the current location", async () => {
      await page.evaluate(() => {
        window.interceptNavigation();
      });
      await page.click("text=queryLink");
      let query = await page.evaluate(() => window.currentQuery());
      expect(query).to.equal("thing=value");
    });
  });

  describe(`currentHash`, () => {
    it("should be empty when there is no hash", async () => {
      let hash = await page.evaluate(() => window.currentHash());
      expect(hash).to.equal("");
    });
    it("should equal the hash of the current location", async () => {
      await page.evaluate(() => {
        window.interceptNavigation();
      });
      await page.click("text=hashLink");
      let hash = await page.evaluate(() => window.currentHash());
      expect(hash).to.equal("test");
    });
  });

  after(async () => {
    server.close();
    browser.close();
  });
});
