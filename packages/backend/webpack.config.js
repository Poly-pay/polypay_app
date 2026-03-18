const path = require('path');

module.exports = function (options) {
  return {
    ...options,
    watchOptions: {
      ignored: [
        '**/node_modules/**',
        '**/dist/**',
        '**/logs/**',
        '**/.git/**',
        '**/assets/**',
        '**/test/**',
      ],
      aggregateTimeout: 300,
      poll: false,
    },
  };
};
