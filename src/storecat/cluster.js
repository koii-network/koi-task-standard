const { Cluster } = require('puppeteer-cluster');
let cluster = null;

module.exports = {
	puppeteerCluster: async () => {
		if (cluster) return cluster;
		cluster = await Cluster.launch({
			concurrency: Cluster.CONCURRENCY_CONTEXT,
			maxConcurrency: 4,
		});
		await cluster.task(async ({
			page,
			data
		}) => {
			await page.evaluateOnNewDocument(() => {
				Object.defineProperty(navigator, 'webdriver', {
					get: () => false,
				});
			});
			await page.evaluateOnNewDocument(() => {
				// We can mock this in as much depth as we need for the test.
				window.navigator.chrome = {
					runtime: {},
					// etc.
				};
			});

			await page.evaluateOnNewDocument(() => {
				const originalQuery = window.navigator.permissions.query;
				return (window.navigator.permissions.query = (parameters) =>
					parameters.name === 'notifications' ?
						Promise.resolve({
							state: Notification.permission
						}) :
						originalQuery(parameters));
			});
			
			return {
				html
			};
		});
		return cluster;
	}
};
