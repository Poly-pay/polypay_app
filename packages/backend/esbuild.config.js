const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['dist/main.js'],
  bundle: true,
  platform: 'node',
  target: 'node24',
  outfile: 'dist/main.bundle.js',
  external: [
    // Prisma - native modules
    '@prisma/client',
    '@prisma/adapter-pg',
    '@prisma/client/runtime/*',
    // PostgreSQL drivers
    'pg',
    'pg-native',
    // Shared package
    '@polypay/shared',
    // NestJS optional dependencies
    '@nestjs/websockets',
    '@nestjs/websockets/*',
    '@nestjs/microservices',
    '@nestjs/microservices/*',
    '@nestjs/platform-express',
    'class-transformer',
    'class-validator',
  ],
  minify: true,
  sourcemap: false,
}).then(() => {
  console.log('Bundle completed: dist/main.bundle.js');
}).catch((error) => {
  console.error('Bundle failed:', error);
  process.exit(1);
});
