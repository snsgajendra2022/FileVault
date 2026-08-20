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
 * Axios 1.12+ ships `exports` that interact poorly with CRA/Webpack 5.
 * Force the browser ESM axios build.
 *
 * om-ai-assistant/react MUST use the prebuilt CJS entry for CRA.
 * Do NOT Babel/transpile the ESM build — react-refresh injects `require()` into
 * ESM and Webpack then fails with "import/export may appear only with sourceType: module".
 * The package's queryClientInterop.ts makes CJS + @tanstack/react-query work.
 */
module.exports = {
  webpack: {
    alias: {
      axios: path.resolve(__dirname, 'node_modules/axios/dist/esm/axios.js'),
      'react-router-dom': path.resolve(__dirname, 'node_modules/react-router-dom'),
      'lucide-react': path.resolve(__dirname, 'node_modules/lucide-react'),
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      '@tanstack/react-query': path.resolve(__dirname, 'node_modules/@tanstack/react-query'),
      'om-ai-assistant/react': path.resolve(
        __dirname,
        'node_modules/om-ai-assistant/dist/cjs/react/index.js'
      ),
    },
    configure: (webpackConfig) => {
      webpackConfig.resolve.plugins = (webpackConfig.resolve.plugins || []).filter(
        (p) => !(p && p.constructor && p.constructor.name === 'ModuleScopePlugin')
      );

      webpackConfig.resolve.modules = [
        path.resolve(__dirname, 'node_modules'),
        'node_modules',
      ];

      const appSrc = resolveRealDir(path.join(__dirname, 'src'));
      const photoStudioSrc = resolveRealDir(path.join(__dirname, 'photostudio-react-tailwind/src'));
      // Host app sources only — never Babel the linked om-ai-assistant package.
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
