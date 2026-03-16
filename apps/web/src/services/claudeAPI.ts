// ============================================================
// claudeAPI.ts — Tunnel to /api/intel/* backend (V6.0)
// Kept for backward compatibility — use InsightWidget directly
// ============================================================

const API_BASE = '/api/intel';

// Landmark analysis — returns full threat briefing
export async function fetchLandmarkAnalysis(name: string, city: string, category: string): Promise<string> {
  try {
    const res = await fetch(`${API_BASE}/briefing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, city, category }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.analysis || '• Intelligence analysis pending.\n\n• Secure connection established.\n\n• Query the target to retrieve classified data.';
  } catch (e) {
    console.error('Analysis fetch failed:', e);
    return '• Intelligence uplink disrupted.\n\n• Secure proxy connection failed.\n\n• Check satellite terminal connectivity.';
  }
}
