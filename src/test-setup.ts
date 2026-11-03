// Runs before every test file (angular.json, test options). Tests never
// use the network: a download (e.g. the announcements) fails at once, as
// it would offline, and a test that needs one stubs fetch itself.
globalThis.fetch = () => Promise.reject(new Error('No network in tests'));
