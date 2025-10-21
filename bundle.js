// bundle.js
const esbuild = require('esbuild');
const path = require('path');

esbuild.build({
  entryPoints: [path.join(__dirname, 'src', 'extension.ts')],
  bundle: true,
  platform: 'node',
  external: [
    'vscode',
    'velocityjs',
    'dustjs-linkedin',
    'atpl',
    'liquor',
    'twig',
    'ejs',
    'eco',
    'jazz',
    'jqtpl',
    'hamljs',
    'hamlet',
    'whiskers',
    'haml-coffee',
    'hogan.js',
    'templayed',
    'handlebars',
    'underscore',
    'lodash',
    'walrus',
    'mustache',
    'just',
    'ect',
    'mote',
    'toffee',
    'dot',
    'bracket-template',
    'ractive',
    'htmling',
    'babel-core',
    'plates',
    'react',
    'react-dom/server',
    'vash',
    'slm',
    'marko',
    'teacup/lib/express',
    'coffee-script',
    'squirrelly',
    'twing',
  ],
  outfile: path.join(__dirname, 'out', 'extension.js'),
  minify: true,           // 🔹 Minify to shrink bundle size
  sourcemap: false,       // optional: disable if not needed
  treeShaking: true,      // 🔹 Tree-shaking for unused code
  target: ['node20'],     // matches your Node.js runtime
}).then(() => {
  console.log('✅ Bundle built successfully with minification and tree-shaking!');
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
