// vite.config.ts
import { defineConfig } from "file:///C:/dev/argus/node_modules/.pnpm/vite@5.4.21_@types+node@25.5.0/node_modules/vite/dist/node/index.js";
import react from "file:///C:/dev/argus/node_modules/.pnpm/@vitejs+plugin-react@4.7.0_vite@5.4.21_@types+node@25.5.0_/node_modules/@vitejs/plugin-react/dist/index.js";
import cesium from "file:///C:/dev/argus/node_modules/.pnpm/vite-plugin-cesium@1.2.23_cesium@1.139.1_rollup@4.59.0_vite@5.4.21_@types+node@25.5.0_/node_modules/vite-plugin-cesium/dist/index.mjs";
import path from "path";
var __vite_injected_original_dirname = "C:\\dev\\argus\\apps\\web";
var vite_config_default = defineConfig({
  // Read .env from monorepo root, not apps/web/
  envDir: path.resolve(__vite_injected_original_dirname, "../../"),
  plugins: [
    react(),
    cesium()
  ],
  server: {
    port: 5173,
    open: true
  },
  build: {
    target: "esnext",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          cesium: ["cesium"],
          maplibre: ["maplibre-gl"],
          deckgl: ["@deck.gl/core", "@deck.gl/layers", "@deck.gl/geo-layers"]
        }
      }
    }
  },
  define: {
    // Required by some CesiumJS internals
    "process.env": {}
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxkZXZcXFxcYXJndXNcXFxcYXBwc1xcXFx3ZWJcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXGRldlxcXFxhcmd1c1xcXFxhcHBzXFxcXHdlYlxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovZGV2L2FyZ3VzL2FwcHMvd2ViL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IGNlc2l1bSBmcm9tICd2aXRlLXBsdWdpbi1jZXNpdW0nO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIC8vIFJlYWQgLmVudiBmcm9tIG1vbm9yZXBvIHJvb3QsIG5vdCBhcHBzL3dlYi9cbiAgZW52RGlyOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vJyksXG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCgpLFxuICAgIGNlc2l1bSgpLFxuICBdLFxuICBzZXJ2ZXI6IHtcbiAgICBwb3J0OiA1MTczLFxuICAgIG9wZW46IHRydWUsXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgdGFyZ2V0OiAnZXNuZXh0JyxcbiAgICBzb3VyY2VtYXA6IHRydWUsXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgb3V0cHV0OiB7XG4gICAgICAgIG1hbnVhbENodW5rczoge1xuICAgICAgICAgIGNlc2l1bTogWydjZXNpdW0nXSxcbiAgICAgICAgICBtYXBsaWJyZTogWydtYXBsaWJyZS1nbCddLFxuICAgICAgICAgIGRlY2tnbDogWydAZGVjay5nbC9jb3JlJywgJ0BkZWNrLmdsL2xheWVycycsICdAZGVjay5nbC9nZW8tbGF5ZXJzJ10sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG4gIGRlZmluZToge1xuICAgIC8vIFJlcXVpcmVkIGJ5IHNvbWUgQ2VzaXVtSlMgaW50ZXJuYWxzXG4gICAgJ3Byb2Nlc3MuZW52Jzoge30sXG4gIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBMlAsU0FBUyxvQkFBb0I7QUFDeFIsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sWUFBWTtBQUNuQixPQUFPLFVBQVU7QUFIakIsSUFBTSxtQ0FBbUM7QUFLekMsSUFBTyxzQkFBUSxhQUFhO0FBQUE7QUFBQSxFQUUxQixRQUFRLEtBQUssUUFBUSxrQ0FBVyxRQUFRO0FBQUEsRUFDeEMsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sT0FBTztBQUFBLEVBQ1Q7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxFQUNSO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxRQUFRO0FBQUEsSUFDUixXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixjQUFjO0FBQUEsVUFDWixRQUFRLENBQUMsUUFBUTtBQUFBLFVBQ2pCLFVBQVUsQ0FBQyxhQUFhO0FBQUEsVUFDeEIsUUFBUSxDQUFDLGlCQUFpQixtQkFBbUIscUJBQXFCO0FBQUEsUUFDcEU7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFFBQVE7QUFBQTtBQUFBLElBRU4sZUFBZSxDQUFDO0FBQUEsRUFDbEI7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
