import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, copyFileSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));

export default defineConfig({
  plugins: [
    {
      name: 'copy-graphql-schema',
      closeBundle() {
        copyFileSync(
          path.resolve(__dirname, 'src/graphql/schema.graphql'),
          path.resolve(__dirname, 'dist/schema.graphql')
        );
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    ssr: 'src/index.ts',
    rollupOptions: {
      output: {
        format: 'es',
        entryFileNames: 'index.js',
      },
      external: [
        ...Object.keys(pkg.dependencies || {}),
        /^node:/,
        'fs', 'path', 'util', 'child_process', 'crypto', 'stream', 'stream/web', 'stream/promises', 'http', 'https', 'os', 'zlib', 'buffer', 'events', 'url', 'fs/promises',
      ],
    },
    target: 'node20',
    outDir: 'dist',
    emptyOutDir: true,
  },
});
