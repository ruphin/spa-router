const puppeteer = require('puppeteer');
const { expect } = require('chai');
const browserSync = require('browser-sync').create();

let browser = null;
let page = null;

before(async function() {
  // Set a higher timeout to allow puppeteer and browserSync time to start
  this.timeout(5000);

  // Workaround until https://github.com/GoogleChrome/puppeteer/issues/290 is fixed
  browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });

  page = await browser.newPage();

  await page.setViewport({
    width: 1024,
    height: 768
  });

  await new Promise(resolve =>
    browserSync.init(
      {
        port: 5000,
        notify: false,
        open: false,
        ui: false,
        logLevel: 'silent',
        server: {
          baseDir: ['.', 'node_modules']
        }
      },
      resolve
    )
  );
});

after(async () => {
  await browser.close();
  browserSync.exit();
});

describe('GluonRouter', () => {
  describe(`onRouteChange`, () => {
    beforeEach(async () => {
      await page.goto('http://localhost:5000/test/onRouteChange.html');
    });
    it('should do nothing when not navigating', async () => {
      const callbackCalled = await page.evaluate(() => {
        let called = false;
        window.onRouteChange(() => (called = true));
        return called;
      });
      expect(callbackCalled).to.be.false;
    });

    it('should fire callback upon hashchange', async () => {
      const callbackCalled = await page.evaluate(() => {
        let called = false;
        window.onRouteChange(() => (called = true));
        document.getElementById('hashLink').click();
        return called;
      });
      expect(callbackCalled).to.be.true;
    });
    it('should fire callback upon location-changed', async () => {
      const callbackCalled = await page.evaluate(() => {
        let called = false;
        window.onRouteChange(() => (called = true));
        window.dispatchEvent(new Event('location-changed'));
        return called;
      });
      expect(callbackCalled).to.be.true;
    });
    it('should fire callback upon popstate', async () => {
      await page.evaluate(async () => {
        window.called = false;
        window.onRouteChange(() => (window.called = true));
        window.history.pushState({}, 'test', '#test');
      });
      expect(await page.url()).to.equal('http://localhost:5000/test/onRouteChange.html#test');
      await page.goBack();
      expect(await page.url()).to.equal('http://localhost:5000/test/onRouteChange.html');
      const callbackCalled = await page.evaluate(async () => {
        return window.called;
      });
      expect(callbackCalled).to.be.true;
    });
  });

  describe(`interceptLinks`, () => {
    beforeEach(async () => {
      await page.goto('http://localhost:5000/test/interceptLinks.html');
    });

    it('should not intercept links before being activated', async () => {
      await page.evaluate(() => {
        document.getElementById('internalLink').click();
      });
      await page.waitForSelector('body');
      expect(await page.evaluate(() => window.clicked)).to.be.undefined;
      expect(await page.url()).to.equal('http://localhost:5000/some/internal/link');
    });

    it('should not intercept cross domain links', async () => {
      await page.evaluate(() => {
        window.interceptLinks();
        document.getElementById('crossDomainLink').click();
      });
      await page.waitForSelector('body');
      expect(await page.evaluate(() => window.clicked)).to.be.undefined;
      expect(await page.url()).to.equal('http://example.com/');
    });

    it('should intercept all same domain links by default', async () => {
      await page.evaluate(() => {
        window.interceptLinks();
        document.getElementById('internalLink').click();
      });
      await page.waitForSelector('body');
      expect(await page.evaluate(() => window.clicked)).to.be.true;
      expect(await page.url()).to.equal('http://localhost:5000/some/internal/link');
    });

    it('should not intercept links that are exluded', async () => {
      await page.evaluate(() => {
        window.interceptLinks({ exclude: [/\/internal\/link/] });
        document.getElementById('internalLink').click();
      });
      await page.waitForSelector('body');
      expect(await page.evaluate(() => window.clicked)).to.be.undefined;
      expect(await page.url()).to.equal('http://localhost:5000/some/internal/link');
    });

    it('should not intercept links that are not included', async () => {
      await page.evaluate(() => {
        window.interceptLinks({ include: [/\/some\/other\/link/] });
        document.getElementById('internalLink').click();
      });
      await page.waitForSelector('body');
      expect(await page.evaluate(() => window.clicked)).to.be.undefined;
      expect(await page.url()).to.equal('http://localhost:5000/some/internal/link');
    });

    it('should not intercept links that are included but also excluded', async () => {
      await page.evaluate(() => {
        window.interceptLinks({ include: [/\/link/], exclude: [/\/internal\/link/] });
        document.getElementById('internalLink').click();
      });
      await page.waitForSelector('body');
      expect(await page.evaluate(() => window.clicked)).to.be.undefined;
      expect(await page.url()).to.equal('http://localhost:5000/some/internal/link');
    });

    it('should intercept links that are included', async () => {
      await page.evaluate(() => {
        window.interceptLinks({ include: [/\/link/] });
        document.getElementById('internalLink').click();
      });
      await page.waitForSelector('body');
      expect(await page.evaluate(() => window.clicked)).to.be.true;
      expect(await page.url()).to.equal('http://localhost:5000/some/internal/link');
    });

    it('should intercept links that are included and not excluded', async () => {
      await page.evaluate(() => {
        window.interceptLinks({ include: [/\/link/], exclude: [/\/other\/internal\/link/] });
        document.getElementById('internalLink').click();
      });
      await page.waitForSelector('body');
      expect(await page.evaluate(() => window.clicked)).to.be.true;
      expect(await page.url()).to.equal('http://localhost:5000/some/internal/link');
    });
  });

  describe(`curentPath`, () => {
    it('should equal the current path', async () => {
      await page.goto('http://localhost:5000/test/currentPath.html');
      let currentPath = await page.evaluate(() => window.currentPath());
      expect(currentPath).to.equal('/test/currentPath.html');
    });
  });

  describe(`curentHash`, () => {
    it('should be empty when there is no hash', async () => {
      await page.goto('http://localhost:5000/test/currentHash.html');
      let currentPath = await page.evaluate(() => window.currentHash());
      expect(currentPath).to.equal('');
    });
    it('should equal the current hash', async () => {
      await page.goto('http://localhost:5000/test/currentHash.html#some-hash');
      let currentPath = await page.evaluate(() => window.currentHash());
      expect(currentPath).to.equal('some-hash');
    });
  });

  describe(`currentQuery`, () => {
    it('should be empty when there is no query parameter', async () => {
      await page.goto('http://localhost:5000/test/currentQuery.html');
      let currentPath = await page.evaluate(() => window.currentQuery());
      expect(currentPath).to.equal('');
    });
    it('should equal the current query', async () => {
      await page.goto('http://localhost:5000/test/currentQuery.html?some=query');
      let currentPath = await page.evaluate(() => window.currentQuery());
      expect(currentPath).to.equal('some=query');
    });
  });
});
