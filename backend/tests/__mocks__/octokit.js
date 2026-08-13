let mockRequestFn = jest.fn(async () => ({ data: [] }));

class MockApp {
  getInstallationOctokit() {
    return Promise.resolve({
      request: mockRequestFn,
    });
  }
}

module.exports = { App: MockApp };
module.exports.__setMockRequest = (fn) => { mockRequestFn = fn; };
