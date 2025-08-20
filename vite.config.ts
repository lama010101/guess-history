import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { spawn, ChildProcess } from "child_process";
import { createConnection } from "node:net";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    allowedHosts: ["0711bf2f-12eb-4a9e-aa93-d15dd2ef2bde.lovableproject.com"],
    proxy: {
      '/languages': {
        target: 'https://extensions.aitopia.ai',
        changeOrigin: true,
        secure: false,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization'
        }
      },
      '/ai': {
        target: 'https://extensions.aitopia.ai',
        changeOrigin: true,
        secure: false,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization'
        }
      },
      'https://extensions.aitopia.ai/': {
        target: 'https://extensions.aitopia.ai',
        changeOrigin: true,
        secure: false,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization'
        },
        rewrite: (path) => path.replace(/^\/https:\/\/extensions\.aitopia\.ai/, '')
      }
    },
  },
  plugins: ([
    react(),
    // Dev-only: auto-start PartyKit lobby server if not already running
    ((): Plugin | null => {
      if (mode !== 'development') return null;
      let pkProcess: ChildProcess | null = null;
      let attempted = false;
      return {
        name: 'start-partykit-dev',
        configureServer(server: ViteDevServer) {
          if (attempted) return;
          attempted = true;
          const hostEnv = process.env.VITE_PARTYKIT_HOST || 'localhost:1999';
          const [host, portStr] = hostEnv.split(':');
          const port = Number(portStr || 1999);

          const checkUp = (onResult: (up: boolean) => void) => {
            const socket = createConnection({ host, port }, () => {
              socket.end();
              onResult(true);
            });
            socket.on('error', () => {
              onResult(false);
            });
          };

          checkUp((up) => {
            if (up) {
              console.log(`[partykit] detected dev server at ${host}:${port}`);
              return;
            }
            console.log('[partykit] starting dev server via "npm run partykit:dev"...');
            pkProcess = spawn('npm', ['run', 'partykit:dev'], {
              shell: true,
              stdio: 'inherit',
            });

            const stop = () => {
              if (pkProcess && !pkProcess.killed) {
                try { pkProcess.kill(); } catch { /* noop */ }
                pkProcess = null;
              }
            };

            server.httpServer?.once('close', stop);
            process.once('exit', stop);
            process.once('SIGINT', () => { stop(); process.exit(0); });
            process.once('SIGTERM', () => { stop(); process.exit(0); });
          });
        },
      };
    })(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean) as Plugin[]),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));