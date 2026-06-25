const path = require('path');

const waReactSrc = path.resolve(__dirname, 'whatsapp-plugin/src/react/index.ts');
const waReactCjs = path.resolve(__dirname, 'whatsapp-plugin/dist/cjs/react/index.js');

/**
 * Prefer TypeScript source so CRA/babel compiles react-query imports correctly.
 * Fall back to CJS dist for production builds without source.
 */
module.exports = {
  webpack: {
    alias: {
      axios: path.resolve(__dirname, 'node_modules/axios/dist/esm/axios.js'),
      'whatsapp-plugin/react': waReactSrc,
      'whatsapp-plugin/react$': waReactSrc,
    },
    configure: (webpackConfig) => {
      webpackConfig.resolve.plugins = (webpackConfig.resolve.plugins || []).filter(
        (p) => !(p && p.constructor && p.constructor.name === 'ModuleScopePlugin')
      );

      // file: deps symlink to repo folder — keep under node_modules for babel exclude
      webpackConfig.resolve.symlinks = false;

      // Prefer CJS entry (main) over "module" (ESM)
      webpackConfig.resolve.mainFields = ['browser', 'main'];

      const oneOf = webpackConfig.module?.rules?.find((r) => Array.isArray(r.oneOf))?.oneOf;
      if (oneOf) {
        for (const rule of oneOf) {
          if (!rule.loader || !String(rule.loader).includes('babel-loader')) continue;
          const prev = rule.include;
          const waInclude = path.resolve(__dirname, 'whatsapp-plugin/src');
          if (Array.isArray(prev)) {
            rule.include = [...prev, waInclude];
          } else if (prev) {
            rule.include = [prev, waInclude];
          }
          const prevEx = rule.exclude;
          const waExclude = /whatsapp-plugin[\\/]dist/;
          if (Array.isArray(prevEx)) {
            rule.exclude = [...prevEx, waExclude];
          } else if (prevEx) {
            rule.exclude = [prevEx, waExclude];
          }
        }
      }

      return webpackConfig;
    },
  },
};
