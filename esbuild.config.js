const esbuild = require('esbuild');

// Ignore optional requires in @vue/compiler-sfc
const ignoreOptionalRequires = {
  name: 'ignore-vue-optional-requires',
  setup(build) {
    const optionalModules = [
      'velocityjs','dustjs-linkedin','atpl','liquor','twig','ejs','eco','jazz','jqtpl',
      'hamljs','hamlet','whiskers','haml-coffee','hogan.js','templayed','handlebars',
      'underscore','lodash','walrus','mustache','just','ect','mote','toffee','dot',
      'bracket-template','ractive','htmling','babel-core','plates','react-dom/server',
      'react','vash','slm','marko','teacup/lib/express','coffee-script','squirrelly','twing'
    ];

    build.onResolve({ filter: /.*/ }, args => {
      if (optionalModules.includes(args.path)) {
        return { path: args.path, external: true };
      }
    });
  }
};

esbuild.build({
  entryPoints: ['src/extension.ts'],
  bundle: true,
  platform: 'node',
  outfile: 'out/extension.js',
  external: ['vscode'], // always external
  logLevel: 'info',
  plugins: [ignoreOptionalRequires]
}).catch(err => {
  console.error(err);
  process.exit(1);
});
