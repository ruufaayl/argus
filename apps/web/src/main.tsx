import ReactDOM from 'react-dom/client';
import { App } from './App';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found. Ensure index.html has a <div id="root">.');
}

// NOTE: React.StrictMode intentionally removed.
// CesiumJS creates a WebGL context that cannot survive StrictMode's
// double mount/unmount cycle in development. This is a known
// CesiumJS + React 18 incompatibility.
ReactDOM.createRoot(rootElement).render(<App />);
