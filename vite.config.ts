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
      sourcemap: 'hidden',
      rollupOptions: {
        output: {
          manualChunks: {
            // Heavy map runtime — downloaded once, cached hard
            mapbox: ['mapbox-gl', 'react-map-gl'],
            // Firebase SDK — large but rarely changes
            firebase: ['firebase/app', 'firebase/firestore', 'firebase/storage'],
            // React core — near-permanent cache
            vendor: ['react', 'react-dom'],
            // Spatial utilities — loaded by multiple components
            turf: ['@turf/distance', '@turf/helpers', '@turf/boolean-point-in-polygon', '@turf/bbox'],
          }
        }
      },
      // Mapbox GL is intentionally large (~1.4MB) — it's the map engine
      chunkSizeWarningLimit: 1500,
    },
    esbuild: {
      // Strip console.log/warn and debugger in production builds
      drop: mode === 'production' ? ['console', 'debugger'] : [],
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
