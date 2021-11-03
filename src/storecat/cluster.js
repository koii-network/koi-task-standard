/* eslint-disable no-undef */
const { Cluster } = require("puppeteer-cluster");
let cluster = null;

export default async function puppeteerCluster() {
  if (cluster) return cluster;
  cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_CONTEXT,
    maxConcurrency: 4
  });
  await cluster.task(async ({ page, data }) => {
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", {
        get: () => false
      });
    });
    await page.evaluateOnNewDocument(() => {
      // We can mock this in as much depth as we need for the test.
      window.navigator.chrome = {
        runtime: {}
        // etc.
      };
    });

    await page.evaluateOnNewDocument(() => {
      const originalQuery = window.navigator.permissions.query;
      return (window.navigator.permissions.query = (parameters) =>
        parameters.name === "notifications"
          ? Promise.resolve({
              state: Notification.permission
            })
          : originalQuery(parameters));
    });
    await page.evaluateOnNewDocument(() => {
      // Overwrite the `plugins` property to use a custom getter.
      Object.defineProperty(navigator, "plugins", {
        // This just needs to have `length > 0` for the current test,
        // but we could mock the plugins too if necessary.
        get: () => [1, 2, 3, 4, 5]
      });
    });
    // Pass the Languages Test.
    await page.evaluateOnNewDocument(() => {
      // Overwrite the `plugins` property to use a custom getter.
      Object.defineProperty(navigator, "languages", {
        get: () => ["en-US", "en"]
      });
    });
    await page.goto(data.url);
    const html = await page.content();
    if (data.takeScreenshot) {
      await page.setViewport({
        width: 1920,
        height: 1080
      });
      await page.screenshot({
        path: data.imagePath,
        type: "jpeg"
      });
      return {
        imagePath: data.imagePath,
        html
      };
    }
    return {
      html
    };
  });
  return cluster;
}
