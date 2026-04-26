/**
 * VeritasInsightsPanel — Carbon-credit AI intelligence brief.
 *
 * Calls /api/veritas/brief which:
 *   1. Pulls top climate articles from GDELT v2 (last 24h, ~12 items)
 *   2. Sends headlines to Groq llama-3.3-70b-versatile for synthesis
 *   3. Returns a 3-paragraph brief: RISK SIGNALS / MARKET-POLICY / PHYSICAL CLIMATE
 *
 * No Claude / Anthropic. No hardcoded fallback brief. If Groq is down or
 * GROQ_API_KEY is missing on Vercel, shows an explicit error state with
 * the underlying message + a manual retry button.
 *
 * Refresh policy:
 *   - Auto-refresh on mount + every 10 min while panel is visible
 *   - Backend cache TTL is 10 min so consecutive panel mounts share results
 */

import { Panel } from './Panel';
import { t } from '@/services/i18n';
import { escapeHtml, sanitizeUrl } from '@/utils/sanitize';

interface VeritasBriefHeadline {
  title: string;
  url: string;
  source: string;
  seendate: string;
}

interface VeritasBriefSuccess {
  ok: true;
  brief: string;
  headlines: VeritasBriefHeadline[];
  sources: string[];
  generatedAt: string;
  model: string;
}

interface VeritasBriefFailure {
  ok: false;
  error: string;
  headlines?: VeritasBriefHeadline[];
}

type VeritasBriefResponse = VeritasBriefSuccess | VeritasBriefFailure;
type GlobalTimeRange = '1h' | '6h' | '24h' | '48h' | '7d' | 'all';

const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 min — matches backend cache TTL

// Map dashboard timeRange → GDELT timespan param.
// GDELT supports values like 1h, 6h, 24h (1d), 7d. For '1h'/'6h' we narrow the
// brief to recent breaking news; for 'all' we widen to 7d.
const TIME_RANGE_TO_GDELT_SPAN: Record<GlobalTimeRange, string> = {
  '1h': '1h', '6h': '6h', '24h': '1d', '48h': '2d', '7d': '7d', 'all': '7d',
};

export class VeritasInsightsPanel extends Panel {
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private generation = 0;
  private currentTimeRange: GlobalTimeRange = '7d';
  private timeRangeListener: ((e: Event) => void) | null = null;

  constructor() {
    super({
      id: 'insights',
      title: 'AI INSIGHTS',
      showCount: false,
      infoTooltip: 'Carbon-credit risk brief synthesised by Groq Llama-3.3-70b from climate-relevant headlines (GDELT). Auto-refreshes every 10 minutes and follows the dashboard timeRange.',
    });
    this.subscribeToTimeRange();
    this.renderLoading();
    void this.fetchBrief();
    this.startAutoRefresh();
  }

  public destroy(): void {
    this.stopAutoRefresh();
    if (this.timeRangeListener) {
      window.removeEventListener('veritas:timeRangeChanged', this.timeRangeListener);
      this.timeRangeListener = null;
    }
    super.destroy?.();
  }

  private subscribeToTimeRange(): void {
    this.timeRangeListener = (e: Event) => {
      const detail = (e as CustomEvent<{ range: GlobalTimeRange }>).detail;
      if (!detail || !detail.range || detail.range === this.currentTimeRange) return;
      this.currentTimeRange = detail.range;
      // Re-synthesise the brief with the new time window.
      this.renderLoading();
      void this.fetchBrief();
    };
    window.addEventListener('veritas:timeRangeChanged', this.timeRangeListener);
  }

  private startAutoRefresh(): void {
    if (this.refreshTimer) return;
    this.refreshTimer = setInterval(() => {
      // Skip if document hidden — saves Groq tokens
      if (typeof document !== 'undefined' && document.hidden) return;
      void this.fetchBrief();
    }, REFRESH_INTERVAL_MS);
  }

  private stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private async fetchBrief(): Promise<void> {
    const gen = ++this.generation;
    try {
      const span = TIME_RANGE_TO_GDELT_SPAN[this.currentTimeRange];
      const url = `/api/veritas/brief?span=${encodeURIComponent(span)}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      // Response may be 503 with valid JSON body — read body first, status second
      let data: VeritasBriefResponse;
      try {
        data = (await res.json()) as VeritasBriefResponse;
      } catch {
        throw new Error(`HTTP ${res.status} (non-JSON response)`);
      }
      if (gen !== this.generation) return; // stale callback
      if (data.ok) {
        this.renderBrief(data);
      } else {
        this.renderError(data.error, data.headlines);
      }
    } catch (err) {
      if (gen !== this.generation) return;
      const msg = err instanceof Error ? err.message : 'Unknown fetch failure';
      this.renderError(`Network error: ${msg}`);
    }
  }

  private renderLoading(): void {
    this.content.innerHTML = `
      <div class="vt-insights-loading" style="padding:14px 12px;font-family:var(--font-sans, system-ui);font-size:11px;color:var(--text-dim, #888);letter-spacing:0.06em;">
        <span class="vt-loading-dot" style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--vt-gold, #c8860a);margin-right:8px;animation:vt-pulse 1.4s ease-in-out infinite;"></span>
        <span style="text-transform:uppercase;">Synthesising carbon brief — Groq Llama-3.3-70b</span>
      </div>
      <style>
        @keyframes vt-pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
      </style>
    `;
  }

  private renderError(message: string, headlines?: VeritasBriefHeadline[]): void {
    const headlinesBlock = headlines && headlines.length > 0
      ? this.renderHeadlinesList(headlines)
      : '';
    this.content.innerHTML = `
      <div class="vt-insights-error" style="padding:14px 12px;font-family:var(--font-sans, system-ui);">
        <div style="font-family:var(--font-mono, monospace);font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:var(--vt-crimson, #f87171);margin-bottom:8px;">
          ⚠ Synthesis unavailable
        </div>
        <div style="font-size:12px;color:var(--text, #f5f0eb);margin-bottom:12px;line-height:1.5;">
          ${escapeHtml(message)}
        </div>
        <button data-vt-retry="1" type="button" style="font-family:var(--font-mono, monospace);font-size:10px;letter-spacing:0.10em;text-transform:uppercase;background:transparent;color:var(--vt-gold, #c8860a);border:1px solid rgba(200, 134, 10, 0.42);padding:5px 12px;cursor:pointer;border-radius:2px;">
          Retry
        </button>
        ${headlinesBlock}
      </div>
    `;
    const retry = this.content.querySelector('[data-vt-retry]') as HTMLButtonElement | null;
    retry?.addEventListener('click', () => {
      this.renderLoading();
      void this.fetchBrief();
    });
  }

  private renderBrief(data: VeritasBriefSuccess): void {
    const generatedAt = new Date(data.generatedAt);
    const timeStr = generatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
    const paragraphs = data.brief.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);

    this.content.innerHTML = `
      <div class="vt-insights" style="padding:12px 14px 16px;font-family:var(--font-sans, system-ui);">
        <div class="vt-insights-meta" style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;font-family:var(--font-mono, monospace);font-size:9px;letter-spacing:0.18em;text-transform:uppercase;">
          <span style="color:var(--vt-gold, #c8860a);">Carbon Intelligence Brief</span>
          <span style="color:var(--text-dim, #888);">${escapeHtml(timeStr)} · ${escapeHtml(data.headlines.length.toString())} sources</span>
        </div>
        <div class="vt-insights-brief" style="font-family:var(--font-sans, system-ui);font-size:13px;line-height:1.55;color:var(--vt-cream, #f5f0eb);font-weight:300;">
          ${paragraphs.map((p, i) => `
            <p style="margin:${i === 0 ? '0' : '12px 0 0'};letter-spacing:0.01em;">
              ${this.formatParagraph(p)}
            </p>
          `).join('')}
        </div>
        <details class="vt-insights-sources" style="margin-top:14px;">
          <summary style="font-family:var(--font-mono, monospace);font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:var(--vt-gold, #c8860a);cursor:pointer;outline:none;">
            ${data.headlines.length} headlines · ${data.sources.length} sources
          </summary>
          ${this.renderHeadlinesList(data.headlines)}
        </details>
        <div style="margin-top:10px;font-family:var(--font-mono, monospace);font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:var(--text-muted, #888);opacity:0.7;">
          Synthesis · ${escapeHtml(data.model)}
        </div>
      </div>
    `;
  }

  /**
   * Light formatting: bold the first paragraph's lead noun-phrase if it ends
   * with a colon ("RISK SIGNALS: ...") and turn URLs into links. Keep cheap.
   */
  private formatParagraph(text: string): string {
    let safe = escapeHtml(text);
    // Lead label like "RISK SIGNALS:" or "MARKET / POLICY:"
    safe = safe.replace(
      /^([A-Z][A-Z0-9 \/\-]{2,40}:)/,
      '<strong style="font-family:var(--font-mono, monospace);font-size:10px;letter-spacing:0.16em;color:var(--vt-gold-bright, #f5b541);font-weight:500;">$1</strong>',
    );
    return safe;
  }

  private renderHeadlinesList(headlines: VeritasBriefHeadline[]): string {
    return `
      <ul style="margin:8px 0 0;padding:0 0 0 14px;font-family:var(--font-sans, system-ui);font-size:11px;color:var(--text-secondary, #ccc);line-height:1.45;list-style:square;">
        ${headlines.slice(0, 12).map(h => {
          const url = sanitizeUrl(h.url);
          if (!url) return '';
          return `<li style="margin:4px 0;">
            <a href="${url}" target="_blank" rel="noopener noreferrer" style="color:var(--text-secondary, #ccc);text-decoration:none;border-bottom:1px solid transparent;transition:border-color 0.15s, color 0.15s;" onmouseenter="this.style.borderColor='rgba(200, 134, 10, 0.55)';this.style.color='var(--vt-gold-bright, #f5b541)'" onmouseleave="this.style.borderColor='transparent';this.style.color='var(--text-secondary, #ccc)'">
              ${escapeHtml(h.title)}
            </a>
            <span style="color:var(--text-muted, #888);font-family:var(--font-mono, monospace);font-size:9px;margin-left:6px;letter-spacing:0.06em;">${escapeHtml(h.source)}</span>
          </li>`;
        }).join('')}
      </ul>
    `;
  }

  // Compat shims — InsightsPanel exposed setMilitaryFlights / setClusters etc.
  // VERITAS panel ignores them; data-loader must not crash if it calls them.
  public setMilitaryFlights(_flights: unknown): void { /* noop */ }
  public updateInsights(_clusters?: unknown): void { /* noop — auto-refresh on timer */ }
  public setClusters(_clusters: unknown): void { /* noop */ }
}

// Re-export under InsightsPanel name so existing imports keep working.
// Activate via panel-layout.ts factory: prefer VeritasInsightsPanel for SITE_VARIANT='full'.
export { VeritasInsightsPanel as InsightsPanel };
// Suppress unused t() warning — kept for future i18n
void t;
