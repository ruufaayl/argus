import { strict as assert } from 'node:assert';
import test from 'node:test';
import handler from '../api/download.js';

const RELEASES_PAGE = 'https://github.com/ruufaayl/argus/releases/latest';

function makeGitHubReleaseResponse(assets) {
  return new Response(JSON.stringify({ assets }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

test('matches full variant for Argus AppImage asset names', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => makeGitHubReleaseResponse([
    {
      name: 'Argus_2.5.7_amd64.AppImage',
      browser_download_url: 'https://downloads.example/Argus_2.5.7_amd64.AppImage',
    },
  ]);

  try {
    const response = await handler(
      new Request('https://argus.app/api/download?platform=linux-appimage&variant=full')
    );
    assert.equal(response.status, 302);
    assert.equal(
      response.headers.get('location'),
      'https://downloads.example/Argus_2.5.7_amd64.AppImage'
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('matches tech variant for TechMonitor AppImage asset names', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => makeGitHubReleaseResponse([
    {
      name: 'TechMonitor_2.5.7_amd64.AppImage',
      browser_download_url: 'https://downloads.example/TechMonitor_2.5.7_amd64.AppImage',
    },
    {
      name: 'Argus_2.5.7_amd64.AppImage',
      browser_download_url: 'https://downloads.example/Argus_2.5.7_amd64.AppImage',
    },
  ]);

  try {
    const response = await handler(
      new Request('https://argus.app/api/download?platform=linux-appimage&variant=tech')
    );
    assert.equal(response.status, 302);
    assert.equal(
      response.headers.get('location'),
      'https://downloads.example/TechMonitor_2.5.7_amd64.AppImage'
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('falls back to release page when requested variant has no matching asset', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => makeGitHubReleaseResponse([
    {
      name: 'Argus_2.5.7_amd64.AppImage',
      browser_download_url: 'https://downloads.example/Argus_2.5.7_amd64.AppImage',
    },
  ]);

  try {
    const response = await handler(
      new Request('https://argus.app/api/download?platform=linux-appimage&variant=finance')
    );
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), RELEASES_PAGE);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
