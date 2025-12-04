module.exports = function (options) {
  return {
    ...options,
    externals: {
      'bcrypt': 'commonjs bcrypt',
      '@mapbox/node-pre-gyp': 'commonjs @mapbox/node-pre-gyp',
    },
    resolve: {
      ...options.resolve,
      fallback: {
        fs: false,
        path: false,
        crypto: false,
      },
    },
    ignoreWarnings: [
      /node_modules\/@mapbox\/node-pre-gyp/,
    ],
  };
};

