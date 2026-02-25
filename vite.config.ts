import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      nodePolyfills({
        include: ['buffer', 'stream', 'util'],
        globals: { Buffer: true, global: true, process: true },
      }),
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Heavy map runtime — downloaded once, cached hard
            mapbox: ['mapbox-gl', 'react-map-gl'],
            // Firebase SDK — large but rarely changes
            firebase: ['firebase/app', 'firebase/firestore', 'firebase/storage'],
            // React core — near-permanent cache
            vendor: ['react', 'react-dom'],
          }
        }
      },
      // Silence the mapbox-gl 500KB chunk warning — it's intentionally an atomic chunk
      chunkSizeWarningLimit: 600,
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
