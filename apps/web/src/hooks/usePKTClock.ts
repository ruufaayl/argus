// ============================================================
// usePKTClock — Pakistan Standard Time (UTC+5) updating 1hz
// ============================================================

import { useState, useEffect } from 'react';

export function usePKTClock(): string {
  const [time, setTime] = useState(() => formatPKT());

  useEffect(() => {
    const id = setInterval(() => setTime(formatPKT()), 1000);
    return () => clearInterval(id);
  }, []);

  return time;
}

function formatPKT(): string {
  const now = new Date();
  // PKT = UTC + 5
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const pkt = new Date(utc + 5 * 3600000);

  const h = String(pkt.getHours()).padStart(2, '0');
  const m = String(pkt.getMinutes()).padStart(2, '0');
  const s = String(pkt.getSeconds()).padStart(2, '0');

  return `${h}:${m}:${s}`;
}
