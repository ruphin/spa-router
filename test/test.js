const { expect } = require("chai");

const { webkit } = require("playwright");

const { createConfig, startServer } = require("es-dev-server");

// (async () => {
//   const browser = await webkit.launch();
//   const context = await browser.newContext();
//   const page = await context.newPage();

//   // Log and continue all network requests
//   page.route("**", (route) => {
//     console.log(route.request().url());
//     route.continue();
//   });

//   await page.goto("http://todomvc.com");
//   await browser.close();
// })();

// let browser = null;
// let page = null;

// before(async function() {
//   // Set a higher timeout to allow puppeteer and browserSync time to start
//   this.timeout(5000);

//   // Workaround until https://github.com/GoogleChrome/puppeteer/issues/290 is fixed
//   browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });

//   page = await browser.newPage();

//   await page.setViewport({
//     width: 1024,
//     height: 768
//   });

//   await new Promise(resolve =>
//     browserSync.init(
//       {
//         port: 5000,
//         notify: false,
//         open: false,
//         ui: false,
//         logLevel: 'silent',
//         server: {
//           baseDir: ['.', 'node_modules']
//         }
//       },
//       resolve
//     )
//   );
// });

// after(async () => {
//   await browser.close();
//   browserSync.exit();
// });

let browser;
let context;
let page;
let server;

describe("spa-router", async () => {
  before(async () => {
    const config = createConfig({ port: 5000 });
    server = (await startServer(config)).server;
    browser = await webkit.launch();
    context = await browser.newContext();
    page = await context.newPage();
  });

  describe(`router`, () => {
    beforeEach(async () => {
      await page.goto("http://localhost:5000/test/test.html");
      // await page.waitForEvent("networkidle");
      await page.waitForSelector("css=.ready");
    });
    it("should do nothing if navigation is not intercepted", async () => {
      await page.evaluate(() => {
        window.fired = false;
        window.router.addEventListener(window.ROUTE_CHANGED, () => {
          window.fired = true;
        });
      });
      await page.click("text=hashLink");

      const routeChangedFired = await page.evaluate(() => {
        return window.fired;
      });
      expect(routeChangedFired).to.be.false;
    });

    it("should fire callback if navigation is intercepted", async () => {
      await page.evaluate(() => {
        window.interceptNavigation();
        window.fired = false;
        window.router.addEventListener(window.ROUTE_CHANGED, () => {
          window.fired = true;
        });
      });
      await page.click("text=hashLink");

      const routeChangedFired = await page.evaluate(() => {
        return window.fired;
      });
      expect(routeChangedFired).to.be.true;
    });
    // it('should fire callback upon location-changed', async () => {
    //   const callbackCalled = await page.evaluate(() => {
    //     let called = false;
    //     window.onRouteChange(() => (called = true));
    //     window.dispatchEvent(new Event('location-changed'));
    //     return called;
    //   });
    //   expect(callbackCalled).to.be.true;
    // });
    // it('should fire callback upon popstate', async () => {
    //   await page.evaluate(async () => {
    //     window.called = false;
    //     window.onRouteChange(() => (window.called = true));
    //     window.history.pushState({}, 'test', '#test');
    //   });
    //   expect(await page.url()).to.equal('http://localhost:5000/test/onRouteChange.html#test');
    //   await page.goBack();
    //   expect(await page.url()).to.equal('http://localhost:5000/test/onRouteChange.html');
    //   const callbackCalled = await page.evaluate(async () => {
    //     return window.called;
    //   });
    //   expect(callbackCalled).to.be.true;
    // });
  });

  // describe(`interceptLinks`, () => {
  //   beforeEach(async () => {
  //     await page.goto('http://localhost:5000/test/interceptLinks.html');
  //   });

  //   it('should not intercept links before being activated', async () => {
  //     await page.evaluate(() => {
  //       document.getElementById('internalLink').click();
  //     });
  //     await page.waitForSelector('body');
  //     expect(await page.evaluate(() => window.clicked)).to.be.undefined;
  //     expect(await page.url()).to.equal('http://localhost:5000/some/internal/link');
  //   });

  //   it('should not intercept cross domain links', async () => {
  //     await page.evaluate(() => {
  //       window.interceptLinks();
  //       document.getElementById('crossDomainLink').click();
  //     });
  //     await page.waitForSelector('body');
  //     expect(await page.evaluate(() => window.clicked)).to.be.undefined;
  //     expect(await page.url()).to.equal('http://example.com/');
  //   });

  //   it('should intercept all same domain links by default', async () => {
  //     await page.evaluate(() => {
  //       window.interceptLinks();
  //       document.getElementById('internalLink').click();
  //     });
  //     await page.waitForSelector('body');
  //     expect(await page.evaluate(() => window.clicked)).to.be.true;
  //     expect(await page.url()).to.equal('http://localhost:5000/some/internal/link');
  //   });

  //   it('should not intercept links that are exluded', async () => {
  //     await page.evaluate(() => {
  //       window.interceptLinks({ exclude: [/\/internal\/link/] });
  //       document.getElementById('internalLink').click();
  //     });
  //     await page.waitForSelector('body');
  //     expect(await page.evaluate(() => window.clicked)).to.be.undefined;
  //     expect(await page.url()).to.equal('http://localhost:5000/some/internal/link');
  //   });

  //   it('should not intercept links that are not included', async () => {
  //     await page.evaluate(() => {
  //       window.interceptLinks({ include: [/\/some\/other\/link/] });
  //       document.getElementById('internalLink').click();
  //     });
  //     await page.waitForSelector('body');
  //     expect(await page.evaluate(() => window.clicked)).to.be.undefined;
  //     expect(await page.url()).to.equal('http://localhost:5000/some/internal/link');
  //   });

  //   it('should not intercept links that are included but also excluded', async () => {
  //     await page.evaluate(() => {
  //       window.interceptLinks({ include: [/\/link/], exclude: [/\/internal\/link/] });
  //       document.getElementById('internalLink').click();
  //     });
  //     await page.waitForSelector('body');
  //     expect(await page.evaluate(() => window.clicked)).to.be.undefined;
  //     expect(await page.url()).to.equal('http://localhost:5000/some/internal/link');
  //   });

  //   it('should intercept links that are included', async () => {
  //     await page.evaluate(() => {
  //       window.interceptLinks({ include: [/\/link/] });
  //       document.getElementById('internalLink').click();
  //     });
  //     await page.waitForSelector('body');
  //     expect(await page.evaluate(() => window.clicked)).to.be.true;
  //     expect(await page.url()).to.equal('http://localhost:5000/some/internal/link');
  //   });

  //   it('should intercept links that are included and not excluded', async () => {
  //     await page.evaluate(() => {
  //       window.interceptLinks({ include: [/\/link/], exclude: [/\/other\/internal\/link/] });
  //       document.getElementById('internalLink').click();
  //     });
  //     await page.waitForSelector('body');
  //     expect(await page.evaluate(() => window.clicked)).to.be.true;
  //     expect(await page.url()).to.equal('http://localhost:5000/some/internal/link');
  //   });
  // });

  // describe(`curentPath`, () => {
  //   it('should equal the current path', async () => {
  //     await page.goto('http://localhost:5000/test/currentPath.html');
  //     let currentPath = await page.evaluate(() => window.currentPath());
  //     expect(currentPath).to.equal('/test/currentPath.html');
  //   });
  // });

  // describe(`curentHash`, () => {
  //   it('should be empty when there is no hash', async () => {
  //     await page.goto('http://localhost:5000/test/currentHash.html');
  //     let currentPath = await page.evaluate(() => window.currentHash());
  //     expect(currentPath).to.equal('');
  //   });
  //   it('should equal the current hash', async () => {
  //     await page.goto('http://localhost:5000/test/currentHash.html#some-hash');
  //     let currentPath = await page.evaluate(() => window.currentHash());
  //     expect(currentPath).to.equal('some-hash');
  //   });
  // });

  // describe(`currentQuery`, () => {
  //   it('should be empty when there is no query parameter', async () => {
  //     await page.goto('http://localhost:5000/test/currentQuery.html');
  //     let currentPath = await page.evaluate(() => window.currentQuery());
  //     expect(currentPath).to.equal('');
  //   });
  //   it('should equal the current query', async () => {
  //     await page.goto('http://localhost:5000/test/currentQuery.html?some=query');
  //     let currentPath = await page.evaluate(() => window.currentQuery());
  //     expect(currentPath).to.equal('some=query');
  //   });
  // });
  after(async () => {
    server.close();
    browser.close();
  });
});
