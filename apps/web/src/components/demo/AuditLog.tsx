// ============================================================
// AuditLog — Immutable log of operator actions
// ============================================================

import { useAuditStore } from '../../stores/auditStore';
import './AuditLog.css';

export function AuditLog() {
  const logs = useAuditStore((s) => s.logs);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}:${String(d.getUTCSeconds()).padStart(2, '0')}`;
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `sentinel-audit-${Date.now()}.json`);
    dlAnchorElem.click();
    useAuditStore.getState().logAction('EXPORT_AUDIT', 'Operator downloaded session audit log');
  };

  return (
    <div className="audit-log">
      <div className="audit-log__header">
        <span className="audit-log__title">SESSION AUDIT TRAIL</span>
        <button className="audit-log__export" onClick={handleExport}>
          [ EXPORT JSON ]
        </button>
      </div>
      
      <div className="audit-log__list">
        {logs.map(log => (
          <div key={log.id} className="audit-entry">
            <span className="audit-entry__time">{formatTime(log.timestamp)}</span>
            <span className="audit-entry__action">[{log.action}]</span>
            <span className="audit-entry__detail">{log.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
