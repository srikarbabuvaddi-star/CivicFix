// Frontend test setup file
// Polyfill window matchMedia if needed by components
if (typeof window !== 'undefined') {
  window.matchMedia =
    window.matchMedia ||
    function () {
      return {
        matches: false,
        addListener: function () {},
        removeListener: function () {}
      };
    };
}

