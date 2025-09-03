// vite.config.ts
import { defineConfig } from "file:///C:/Users/User/OneDrive/Projects/GUESS-HISTORY/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/User/OneDrive/Projects/GUESS-HISTORY/node_modules/@vitejs/plugin-react-swc/index.mjs";
import path from "path";
import { componentTagger } from "file:///C:/Users/User/OneDrive/Projects/GUESS-HISTORY/node_modules/lovable-tagger/dist/index.js";
import { spawn } from "child_process";
import { createConnection } from "node:net";
var __vite_injected_original_dirname = "C:\\Users\\User\\OneDrive\\Projects\\GUESS-HISTORY";
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    allowedHosts: ["0711bf2f-12eb-4a9e-aa93-d15dd2ef2bde.lovableproject.com"],
    proxy: {
      "/languages": {
        target: "https://extensions.aitopia.ai",
        changeOrigin: true,
        secure: false,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept, Authorization"
        }
      },
      "/ai": {
        target: "https://extensions.aitopia.ai",
        changeOrigin: true,
        secure: false,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept, Authorization"
        }
      },
      "https://extensions.aitopia.ai/": {
        target: "https://extensions.aitopia.ai",
        changeOrigin: true,
        secure: false,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept, Authorization"
        },
        rewrite: (path2) => path2.replace(/^\/https:\/\/extensions\.aitopia\.ai/, "")
      }
    }
  },
  plugins: [
    react(),
    // Dev-only: auto-start PartyKit lobby server if not already running
    (() => {
      if (mode !== "development") return null;
      let pkProcess = null;
      let attempted = false;
      return {
        name: "start-partykit-dev",
        configureServer(server) {
          if (attempted) return;
          attempted = true;
          const hostEnv = process.env.VITE_PARTYKIT_HOST || "localhost:1999";
          const [host, portStr] = hostEnv.split(":");
          const port = Number(portStr || 1999);
          const checkUp = (onResult) => {
            const socket = createConnection({ host, port }, () => {
              socket.end();
              onResult(true);
            });
            socket.on("error", () => {
              onResult(false);
            });
          };
          checkUp((up) => {
            if (up) {
              console.log(`[partykit] detected dev server at ${host}:${port}`);
              return;
            }
            console.log('[partykit] starting dev server via "npm run partykit:dev"...');
            pkProcess = spawn("npm", ["run", "partykit:dev"], {
              shell: true,
              stdio: "inherit"
            });
            const stop = () => {
              if (pkProcess && !pkProcess.killed) {
                try {
                  pkProcess.kill();
                } catch {
                }
                pkProcess = null;
              }
            };
            server.httpServer?.once("close", stop);
            process.once("exit", stop);
            process.once("SIGINT", () => {
              stop();
              process.exit(0);
            });
            process.once("SIGTERM", () => {
              stop();
              process.exit(0);
            });
          });
        }
      };
    })(),
    mode === "development" && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxVc2VyXFxcXE9uZURyaXZlXFxcXFByb2plY3RzXFxcXEdVRVNTLUhJU1RPUllcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXFVzZXJcXFxcT25lRHJpdmVcXFxcUHJvamVjdHNcXFxcR1VFU1MtSElTVE9SWVxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvVXNlci9PbmVEcml2ZS9Qcm9qZWN0cy9HVUVTUy1ISVNUT1JZL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnLCB0eXBlIFBsdWdpbiwgdHlwZSBWaXRlRGV2U2VydmVyIH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3Qtc3djXCI7XG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xuaW1wb3J0IHsgY29tcG9uZW50VGFnZ2VyIH0gZnJvbSBcImxvdmFibGUtdGFnZ2VyXCI7XG5pbXBvcnQgeyBzcGF3biwgQ2hpbGRQcm9jZXNzIH0gZnJvbSBcImNoaWxkX3Byb2Nlc3NcIjtcbmltcG9ydCB7IGNyZWF0ZUNvbm5lY3Rpb24gfSBmcm9tIFwibm9kZTpuZXRcIjtcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+ICh7XG4gIHNlcnZlcjoge1xuICAgIGhvc3Q6IFwiOjpcIixcbiAgICBwb3J0OiA4MDgwLFxuICAgIGFsbG93ZWRIb3N0czogW1wiMDcxMWJmMmYtMTJlYi00YTllLWFhOTMtZDE1ZGQyZWYyYmRlLmxvdmFibGVwcm9qZWN0LmNvbVwiXSxcbiAgICBwcm94eToge1xuICAgICAgJy9sYW5ndWFnZXMnOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHBzOi8vZXh0ZW5zaW9ucy5haXRvcGlhLmFpJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICBzZWN1cmU6IGZhbHNlLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcyc6ICdHRVQsIFBPU1QsIFBVVCwgREVMRVRFLCBPUFRJT05TJyxcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6ICdPcmlnaW4sIFgtUmVxdWVzdGVkLVdpdGgsIENvbnRlbnQtVHlwZSwgQWNjZXB0LCBBdXRob3JpemF0aW9uJ1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgJy9haSc6IHtcbiAgICAgICAgdGFyZ2V0OiAnaHR0cHM6Ly9leHRlbnNpb25zLmFpdG9waWEuYWknLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIHNlY3VyZTogZmFsc2UsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJzogJ0dFVCwgUE9TVCwgUFVULCBERUxFVEUsIE9QVElPTlMnLFxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogJ09yaWdpbiwgWC1SZXF1ZXN0ZWQtV2l0aCwgQ29udGVudC1UeXBlLCBBY2NlcHQsIEF1dGhvcml6YXRpb24nXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICAnaHR0cHM6Ly9leHRlbnNpb25zLmFpdG9waWEuYWkvJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwczovL2V4dGVuc2lvbnMuYWl0b3BpYS5haScsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgc2VjdXJlOiBmYWxzZSxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnOiAnR0VULCBQT1NULCBQVVQsIERFTEVURSwgT1BUSU9OUycsXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAnT3JpZ2luLCBYLVJlcXVlc3RlZC1XaXRoLCBDb250ZW50LVR5cGUsIEFjY2VwdCwgQXV0aG9yaXphdGlvbidcbiAgICAgICAgfSxcbiAgICAgICAgcmV3cml0ZTogKHBhdGgpID0+IHBhdGgucmVwbGFjZSgvXlxcL2h0dHBzOlxcL1xcL2V4dGVuc2lvbnNcXC5haXRvcGlhXFwuYWkvLCAnJylcbiAgICAgIH1cbiAgICB9LFxuICB9LFxuICBwbHVnaW5zOiAoW1xuICAgIHJlYWN0KCksXG4gICAgLy8gRGV2LW9ubHk6IGF1dG8tc3RhcnQgUGFydHlLaXQgbG9iYnkgc2VydmVyIGlmIG5vdCBhbHJlYWR5IHJ1bm5pbmdcbiAgICAoKCk6IFBsdWdpbiB8IG51bGwgPT4ge1xuICAgICAgaWYgKG1vZGUgIT09ICdkZXZlbG9wbWVudCcpIHJldHVybiBudWxsO1xuICAgICAgbGV0IHBrUHJvY2VzczogQ2hpbGRQcm9jZXNzIHwgbnVsbCA9IG51bGw7XG4gICAgICBsZXQgYXR0ZW1wdGVkID0gZmFsc2U7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBuYW1lOiAnc3RhcnQtcGFydHlraXQtZGV2JyxcbiAgICAgICAgY29uZmlndXJlU2VydmVyKHNlcnZlcjogVml0ZURldlNlcnZlcikge1xuICAgICAgICAgIGlmIChhdHRlbXB0ZWQpIHJldHVybjtcbiAgICAgICAgICBhdHRlbXB0ZWQgPSB0cnVlO1xuICAgICAgICAgIGNvbnN0IGhvc3RFbnYgPSBwcm9jZXNzLmVudi5WSVRFX1BBUlRZS0lUX0hPU1QgfHwgJ2xvY2FsaG9zdDoxOTk5JztcbiAgICAgICAgICBjb25zdCBbaG9zdCwgcG9ydFN0cl0gPSBob3N0RW52LnNwbGl0KCc6Jyk7XG4gICAgICAgICAgY29uc3QgcG9ydCA9IE51bWJlcihwb3J0U3RyIHx8IDE5OTkpO1xuXG4gICAgICAgICAgY29uc3QgY2hlY2tVcCA9IChvblJlc3VsdDogKHVwOiBib29sZWFuKSA9PiB2b2lkKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBzb2NrZXQgPSBjcmVhdGVDb25uZWN0aW9uKHsgaG9zdCwgcG9ydCB9LCAoKSA9PiB7XG4gICAgICAgICAgICAgIHNvY2tldC5lbmQoKTtcbiAgICAgICAgICAgICAgb25SZXN1bHQodHJ1ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHNvY2tldC5vbignZXJyb3InLCAoKSA9PiB7XG4gICAgICAgICAgICAgIG9uUmVzdWx0KGZhbHNlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH07XG5cbiAgICAgICAgICBjaGVja1VwKCh1cCkgPT4ge1xuICAgICAgICAgICAgaWYgKHVwKSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbcGFydHlraXRdIGRldGVjdGVkIGRldiBzZXJ2ZXIgYXQgJHtob3N0fToke3BvcnR9YCk7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbcGFydHlraXRdIHN0YXJ0aW5nIGRldiBzZXJ2ZXIgdmlhIFwibnBtIHJ1biBwYXJ0eWtpdDpkZXZcIi4uLicpO1xuICAgICAgICAgICAgcGtQcm9jZXNzID0gc3Bhd24oJ25wbScsIFsncnVuJywgJ3BhcnR5a2l0OmRldiddLCB7XG4gICAgICAgICAgICAgIHNoZWxsOiB0cnVlLFxuICAgICAgICAgICAgICBzdGRpbzogJ2luaGVyaXQnLFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGNvbnN0IHN0b3AgPSAoKSA9PiB7XG4gICAgICAgICAgICAgIGlmIChwa1Byb2Nlc3MgJiYgIXBrUHJvY2Vzcy5raWxsZWQpIHtcbiAgICAgICAgICAgICAgICB0cnkgeyBwa1Byb2Nlc3Mua2lsbCgpOyB9IGNhdGNoIHsgLyogbm9vcCAqLyB9XG4gICAgICAgICAgICAgICAgcGtQcm9jZXNzID0gbnVsbDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2VydmVyLmh0dHBTZXJ2ZXI/Lm9uY2UoJ2Nsb3NlJywgc3RvcCk7XG4gICAgICAgICAgICBwcm9jZXNzLm9uY2UoJ2V4aXQnLCBzdG9wKTtcbiAgICAgICAgICAgIHByb2Nlc3Mub25jZSgnU0lHSU5UJywgKCkgPT4geyBzdG9wKCk7IHByb2Nlc3MuZXhpdCgwKTsgfSk7XG4gICAgICAgICAgICBwcm9jZXNzLm9uY2UoJ1NJR1RFUk0nLCAoKSA9PiB7IHN0b3AoKTsgcHJvY2Vzcy5leGl0KDApOyB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgIH07XG4gICAgfSkoKSxcbiAgICBtb2RlID09PSAnZGV2ZWxvcG1lbnQnICYmIGNvbXBvbmVudFRhZ2dlcigpLFxuICBdLmZpbHRlcihCb29sZWFuKSBhcyBQbHVnaW5bXSksXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXG4gICAgfSxcbiAgfSxcbn0pKTsiXSwKICAibWFwcGluZ3MiOiAiO0FBQXFVLFNBQVMsb0JBQXFEO0FBQ25ZLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFDakIsU0FBUyx1QkFBdUI7QUFDaEMsU0FBUyxhQUEyQjtBQUNwQyxTQUFTLHdCQUF3QjtBQUxqQyxJQUFNLG1DQUFtQztBQVF6QyxJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssT0FBTztBQUFBLEVBQ3pDLFFBQVE7QUFB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
