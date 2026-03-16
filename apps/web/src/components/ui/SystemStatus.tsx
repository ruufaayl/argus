// ============================================================
// SystemStatus — Bottom-right simulated system readouts
// ============================================================

import { useCommandStore } from '../../stores/commandStore';

export function SystemStatus() {
  const globeReady = useCommandStore((s) => s.globeReady);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
      <span>
        <span className={`status-dot ${globeReady ? 'green' : 'amber'}`} />
        SYS {globeReady ? 'NOMINAL' : 'INIT'}
      </span>
      <span>UPLINK: 42ms</span>
      <span>MEM: 847MB</span>
      <span>SAT LOCK: 14/16</span>
      <span>ENCRYPTION: AES-256</span>
    </div>
  );
}
