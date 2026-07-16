import react from '@vitejs/plugin-react-swc';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

// Get the directory name for ES modules
const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Read the root package.json version
const rootPackagePath = resolve(__dirname, '../package.json');
const rootPackageJson = JSON.parse(readFileSync(rootPackagePath, 'utf-8'));
const rootVersion = rootPackageJson.version;

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        port: 2022,
        host: '0.0.0.0' // Allow access from network
    },
    define: {
        // Expose the root version to the frontend code
        'import.meta.env.APP_VERSION': JSON.stringify(rootVersion),
    },
    optimizeDeps: {
        // react-grid-layout bundles react-draggable, whose log() helper reads
        // process.env.DRAGGABLE_DEBUG. `process` is undefined in the browser, so any
        // drag/resize start throws ReferenceError. Vite's top-level `define` does NOT
        // reach pre-bundled deps, so define it away in the dep optimizer's esbuild pass.
        esbuildOptions: {
            define: {
                'process.env.DRAGGABLE_DEBUG': 'false',
            },
        },
    },
    // build: {
    //     rollupOptions: {
    //         output: {
    //             manualChunks(id) {
    //                 if (id.includes('node_modules')) {
    //                     const modulePath = id.split('node_modules/')[1];
    //                     const topLevelFolder = modulePath.split('/')[0];
    //                     if (topLevelFolder !== '.pnpm') {
    //                         return topLevelFolder;
    //                     }
    //                     const scopedPackageName = modulePath.split('/')[1];
    //                     const chunkName = scopedPackageName.split('@')[scopedPackageName.startsWith('@') ? 1 : 0];
    //                     return chunkName;
    //                 }
    //             }
    //         }
    //     }
    // }
});
