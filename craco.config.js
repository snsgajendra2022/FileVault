const path = require('path');

/**
 * Axios 1.12+ ships `exports` that interact poorly with CRA/Webpack 5: the bundler
 * can pull `lib/adapters/http.js` and Node platform code into the browser bundle.
 * Force the prebuilt browser entry (see axios `browser` field / dist/browser).
 *
 * CRA's ModuleScopePlugin rejects that path as "outside src/"; drop it so the alias works.
 */
module.exports = {
  webpack: {
    alias: {
      // Browser-safe prebundle; use ESM build so `import axios from 'axios'` gets `.create` (CJS .cjs breaks default interop).
      axios: path.resolve(__dirname, 'node_modules/axios/dist/esm/axios.js'),
    },
    configure: (webpackConfig) => {
      webpackConfig.resolve.plugins = (webpackConfig.resolve.plugins || []).filter(
        (p) => !(p && p.constructor && p.constructor.name === 'ModuleScopePlugin')
      );
      return webpackConfig;
    },
  },
};
