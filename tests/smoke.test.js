// Bootstrap smoke test: guarantees `npm test` is green from task 1, so the
// pipeline's real QA has an executable baseline. Feature tasks add their own
// tests next to the code they build; this one can be removed once real tests
// exist.
test('test harness runs', () => {
  expect(1 + 1).toBe(2);
});
