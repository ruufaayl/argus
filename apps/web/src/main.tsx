import ReactDOM from 'react-dom/client';
import * as Cesium from 'cesium';
import { App } from './App';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import './index.css';

// ── Fully disable Cesium Ion BEFORE any viewer/provider is created ──
// Cesium ships with a hardcoded default Ion token. Even with baseLayer:false,
// internal Ion requests can fire and fail, killing the render loop.
Cesium.Ion.defaultAccessToken = '';
// @ts-ignore — prevent any Ion server requests
if (Cesium.Ion.defaultServer) {
  (Cesium.Ion as any).defaultServer = new Cesium.Resource({ url: 'about:blank' });
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found. Ensure index.html has a <div id="root">.');
}

// NOTE: React.StrictMode intentionally removed.
// CesiumJS creates a WebGL context that cannot survive StrictMode's
// double mount/unmount cycle in development. This is a known
// CesiumJS + React 18 incompatibility.
ReactDOM.createRoot(rootElement).render(<App />);
