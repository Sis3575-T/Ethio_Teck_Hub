// Feature: ethiotech-hub, Property: smoke test
const fc = require('fast-check');

describe('fast-check smoke test', () => {
  it('should verify string concatenation length property', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (a, b) => {
        return (a + b).length === a.length + b.length;
      })
    );
  });
});
