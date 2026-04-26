/**
 * VeritasNewsPanel — Climate news headlines aggregated from 18 RSS feeds.
 *
 * Calls /api/veritas/headlines which:
 *   - Fetches all VERITAS_NEWS_CHANNELS (Carbon Brief, UNEP, Mongabay, etc.)
 *     in parallel via the existing /api/rss-proxy
 *   - Parses RSS/Atom XML server-side (no DOMParser in panel)
 *   - Returns merged + sorted-by-pubDate-desc list of headlines
 *
 * UI:
 *   - Tier filter chips (ALL / TIER 1 / TIER 2 / TIER 3)
 *   - Source category badges with VERITAS palette colours
 *   - Hover-gold links open in new tab
 *   - Auto-refresh every 5 min while visible
 *
 * Replaces the legacy LiveNewsPanel (YouTube TV streams) for SITE_VARIANT=full.
 */

import { Panel } from './Panel';
import { escapeHtml, sanitizeUrl } from '@/utils/sanitize';

interface VeritasHeadline {
  title: string;
  url: string;
  source: string;
  sourceColor: string;
  category: string;
  pubDate: string | null;
  excerpt: string;
}

interface VeritasChannelMeta {
  id: string;
  name: string;
  category: string;
  priority: 1 | 2 | 3;
  color: string;
}

interface VeritasHeadlinesResponse {
  ok: boolean;
  items?: VeritasHeadline[];
  channels?: VeritasChannelMeta[];
  totalChannels?: number;
  fetchedChannels?: number;
  generatedAt?: string;
  error?: string;
}

type TierFilter = 'all' | '1' | '2' | '3';

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export class VeritasNewsPanel extends Panel {
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private generation = 0;
  private currentTier: TierFilter = 'all';
  private headlines: VeritasHeadline[] = [];
  private fetchedAt: string | null = null;
  private channelsResolved = 0;
  private channelsTotal = 0;

  constructor() {
    super({
      id: 'live-news',
      title: 'CLIMATE NEWS',
      showCount: true,
      infoTooltip: 'Live climate-policy and carbon-market headlines aggregated from 18 RSS feeds: Carbon Brief, UNEP, Climate Change News, Inside Climate News, Mongabay, NASA Earth, NOAA, Verra, UNFCCC and 9 more. Auto-refreshes every 5 min.',
    });
    this.renderLoading();
    void this.fetchHeadlines();
    this.startAutoRefresh();
  }

  public destroy(): void {
    this.stopAutoRefresh();
    super.destroy?.();
  }

  private startAutoRefresh(): void {
    if (this.refreshTimer) return;
    this.refreshTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      void this.fetchHeadlines();
    }, REFRESH_INTERVAL_MS);
  }

  private stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private async fetchHeadlines(): Promise<void> {
    const gen = ++this.generation;
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (this.currentTier !== 'all') params.set('priority', this.currentTier);
      const res = await fetch(`/api/veritas/headlines?${params.toString()}`, {
        headers: { Accept: 'application/json' },
      });
      let data: VeritasHeadlinesResponse;
      try {
        data = (await res.json()) as VeritasHeadlinesResponse;
      } catch {
        throw new Error(`HTTP ${res.status} (non-JSON)`);
      }
      if (gen !== this.generation) return;
      if (!data.ok || !data.items) {
        this.renderError(data.error || `HTTP ${res.status}`);
        return;
      }
      this.headlines = data.items;
      this.fetchedAt = data.generatedAt || new Date().toISOString();
      this.channelsResolved = data.fetchedChannels || 0;
      this.channelsTotal = data.totalChannels || 0;
      this.setCount(this.headlines.length);
      this.render();
    } catch (err) {
      if (gen !== this.generation) return;
      const msg = err instanceof Error ? err.message : 'Unknown error';
      this.renderError(`Network error: ${msg}`);
    }
  }

  private renderLoading(): void {
    this.content.innerHTML = `
      <div style="padding:14px 12px;font-family:var(--font-sans, system-ui);font-size:11px;color:var(--text-dim, #888);letter-spacing:0.06em;">
        <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--vt-gold, #c8860a);margin-right:8px;animation:vt-news-pulse 1.4s ease-in-out infinite;"></span>
        <span style="text-transform:uppercase;">Aggregating 18 climate feeds…</span>
      </div>
      <style>@keyframes vt-news-pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }</style>
    `;
  }

  private renderError(message: string): void {
    this.content.innerHTML = `
      <div style="padding:14px 12px;font-family:var(--font-sans, system-ui);">
        <div style="font-family:var(--font-mono, monospace);font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:var(--vt-crimson, #f87171);margin-bottom:8px;">⚠ Headline feed unavailable</div>
        <div style="font-size:12px;color:var(--text, #f5f0eb);margin-bottom:12px;line-height:1.5;">${escapeHtml(message)}</div>
        <button data-vt-news-retry="1" type="button" style="font-family:var(--font-mono, monospace);font-size:10px;letter-spacing:0.10em;text-transform:uppercase;background:transparent;color:var(--vt-gold, #c8860a);border:1px solid rgba(200, 134, 10, 0.42);padding:5px 12px;cursor:pointer;border-radius:2px;">Retry</button>
      </div>
    `;
    this.content.querySelector('[data-vt-news-retry]')?.addEventListener('click', () => {
      this.renderLoading();
      void this.fetchHeadlines();
    });
  }

  private render(): void {
    if (this.headlines.length === 0) {
      this.content.innerHTML = `
        <div style="padding:14px 12px;font-family:var(--font-mono, monospace);font-size:10px;letter-spacing:0.10em;color:var(--text-muted);text-transform:uppercase;">
          No headlines from the selected tier in the last refresh.
        </div>
      `;
      return;
    }

    const tierChip = (key: TierFilter, label: string): string => {
      const active = this.currentTier === key;
      return `<button data-vt-tier="${key}" type="button" style="
        font-family:var(--font-mono, monospace);font-size:9px;letter-spacing:0.14em;text-transform:uppercase;
        background:${active ? 'rgba(200, 134, 10, 0.16)' : 'transparent'};
        color:${active ? 'var(--vt-gold-bright, #f5b541)' : 'var(--text-dim, #888)'};
        border:1px solid ${active ? 'rgba(200, 134, 10, 0.55)' : 'rgba(245, 240, 235, 0.10)'};
        padding:4px 10px;cursor:pointer;border-radius:2px;transition:all 0.15s;
      ">${label}</button>`;
    };

    const fetchedTime = this.fetchedAt
      ? new Date(this.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '—';

    this.content.innerHTML = `
      <div class="vt-news-toolbar" style="display:flex;align-items:center;gap:6px;padding:8px 12px;border-bottom:1px solid var(--vt-glass-border, rgba(255,255,255,0.10));flex-wrap:wrap;">
        ${tierChip('all', 'All')}
        ${tierChip('1', 'Tier 1 · Carbon')}
        ${tierChip('2', 'Tier 2 · Mainstream')}
        ${tierChip('3', 'Tier 3 · Specialist')}
        <span style="margin-left:auto;font-family:var(--font-mono, monospace);font-size:9px;letter-spacing:0.14em;color:var(--text-muted, #888);">
          ${this.channelsResolved}/${this.channelsTotal} feeds · ${escapeHtml(fetchedTime)}
        </span>
      </div>
      <div class="vt-news-list" style="padding:4px 0;max-height:100%;overflow-y:auto;">
        ${this.headlines.map(h => this.renderItem(h)).join('')}
      </div>
    `;

    this.content.querySelectorAll('[data-vt-tier]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tier = (btn as HTMLElement).dataset.vtTier as TierFilter;
        if (tier && tier !== this.currentTier) {
          this.currentTier = tier;
          this.renderLoading();
          void this.fetchHeadlines();
        }
      });
    });
  }

  private renderItem(h: VeritasHeadline): string {
    const url = sanitizeUrl(h.url);
    if (!url) return '';
    const ageStr = this.relativeTime(h.pubDate);
    return `
      <a href="${url}" target="_blank" rel="noopener noreferrer" class="vt-news-item" style="
        display:block;padding:10px 12px;border-bottom:1px solid rgba(245, 240, 235, 0.04);
        text-decoration:none;color:inherit;transition:background 0.15s;
      " onmouseenter="this.style.background='rgba(200, 134, 10, 0.05)'" onmouseleave="this.style.background='transparent'">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
          <span style="
            font-family:var(--font-mono, monospace);font-size:8px;letter-spacing:0.16em;text-transform:uppercase;
            color:${escapeHtml(h.sourceColor || '#8BA0BE')};font-weight:500;
          ">${escapeHtml(h.category || h.source)}</span>
          <span style="font-family:var(--font-mono, monospace);font-size:8px;color:var(--text-muted, #888);letter-spacing:0.10em;">${escapeHtml(h.source)}</span>
          <span style="margin-left:auto;font-family:var(--font-mono, monospace);font-size:8px;color:var(--text-muted, #888);">${escapeHtml(ageStr)}</span>
        </div>
        <div style="font-family:var(--font-sans, system-ui);font-size:12px;line-height:1.4;color:var(--vt-cream, #f5f0eb);font-weight:400;letter-spacing:0.005em;">
          ${escapeHtml(h.title)}
        </div>
        ${h.excerpt ? `<div style="font-family:var(--font-sans, system-ui);font-size:10px;line-height:1.45;color:var(--text-secondary, rgba(245,240,235,0.65));margin-top:4px;">${escapeHtml(h.excerpt.slice(0, 160))}${h.excerpt.length > 160 ? '…' : ''}</div>` : ''}
      </a>
    `;
  }

  private relativeTime(iso: string | null): string {
    if (!iso) return '';
    const t = Date.parse(iso);
    if (isNaN(t)) return '';
    const diffMin = Math.floor((Date.now() - t) / 60_000);
    if (diffMin < 1) return 'now';
    if (diffMin < 60) return `${diffMin}m`;
    if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h`;
    return `${Math.floor(diffMin / 1440)}d`;
  }
}
