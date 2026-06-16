const fs = require('fs');
const path = require('path');

const resolveRealDir = (dir) => {
  try {
    return fs.realpathSync.native(path.resolve(dir));
  } catch {
    return path.resolve(dir);
  }
};

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
      // photostudio-react-tailwind has its own node_modules; force one copy so Router/Outlet context works.
      'react-router-dom': path.resolve(__dirname, 'node_modules/react-router-dom'),
      'lucide-react': path.resolve(__dirname, 'node_modules/lucide-react'),
    },
    configure: (webpackConfig) => {
      webpackConfig.resolve.plugins = (webpackConfig.resolve.plugins || []).filter(
        (p) => !(p && p.constructor && p.constructor.name === 'ModuleScopePlugin')
      );

      // Prefer root node_modules so photostudio-react-tailwind does not bundle duplicate routers.
      webpackConfig.resolve.modules = [
        path.resolve(__dirname, 'node_modules'),
        'node_modules',
      ];

      const appSrc = resolveRealDir(path.join(__dirname, 'src'));
      const photoStudioSrc = resolveRealDir(path.join(__dirname, 'photostudio-react-tailwind/src'));
      const babelIncludeDirs = [appSrc, photoStudioSrc];

      const oneOfRule = webpackConfig.module.rules.find((rule) => Array.isArray(rule.oneOf));
      if (oneOfRule) {
        const appBabelRule = oneOfRule.oneOf.find(
          (rule) =>
            rule.loader &&
            String(rule.loader).includes('babel-loader') &&
            rule.test &&
            rule.test.toString().includes('jsx') &&
            rule.include
        );
        if (appBabelRule) {
          // Function include avoids macOS path casing mismatches (filevault vs FileVault).
          appBabelRule.include = (filepath) => {
            let realFile;
            try {
              realFile = fs.realpathSync.native(filepath);
            } catch {
              realFile = path.resolve(filepath);
            }
            return babelIncludeDirs.some(
              (dir) => realFile === dir || realFile.startsWith(`${dir}${path.sep}`)
            );
          };
        }
      }

      return webpackConfig;
    },
  },
};
