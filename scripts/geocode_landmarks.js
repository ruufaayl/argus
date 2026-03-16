// ============================================================
// geocode_landmarks.js — Batch Geocoding with Nominatim (OSM)
// Run with: node scripts/geocode_landmarks.js
//
// Uses Nominatim (free, no API key) with Pakistan bounding box.
// Only updates a landmark if the result is within ~30km of the
// original coordinates AND within Pakistan bounds.
// Saves progress every 100 landmarks.
// ============================================================

const fs = require('fs');
const path = require('path');

// Pakistan bounding box: lat 23.5-37.1, lng 60.8-77.8
const PAK_MIN_LAT = 23.5, PAK_MAX_LAT = 37.1;
const PAK_MIN_LNG = 60.8, PAK_MAX_LNG = 77.8;

// Maximum allowed displacement from original coordinate (~30km latitude)
const MAX_DISPLACEMENT_DEG = 0.3;

const LANDMARKS_FILE = path.resolve(__dirname, '../apps/web/src/data/landmarks.ts');
const source = fs.readFileSync(LANDMARKS_FILE, 'utf8');

const regex = /\{\s*name:\s*["'`]([^"'`]+)["'`],\s*city:\s*["'`]([^"'`]+)["'`],\s*province:\s*["'`]([^"'`]+)["'`],\s*tier:\s*["'`]([^"'`]+)["'`],\s*lat:\s*([\d.-]+),\s*lng:\s*([\d.-]+),\s*category:\s*["'`]([^"'`]+)["'`]\s*\}/g;

const landmarks = [];
let match;
while ((match = regex.exec(source)) !== null) {
  landmarks.push({
    name: match[1],
    city: match[2],
    province: match[3],
    tier: match[4],
    lat: parseFloat(match[5]),
    lng: parseFloat(match[6]),
    category: match[7],
    originalMatch: match[0],
  });
}

console.log(`Found ${landmarks.length} landmarks to geocode via Nominatim (OSM).`);
console.log('Rate limited to 1 request/sec to respect Nominatim TOS.\n');

async function geocodeNominatim(name, city) {
  // Build a Pakistan-specific query
  const q = encodeURIComponent(`${name}, ${city}, Pakistan`);
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=3&countrycodes=pk&accept-language=en`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'ARGUS-Intelligence-Platform/1.0 (admin@argus.pk)' },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const items = await res.json();
  if (!items || items.length === 0) return null;

  // Pick the highest-ranked result within Pakistan
  for (const item of items) {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    if (lat >= PAK_MIN_LAT && lat <= PAK_MAX_LAT && lng >= PAK_MIN_LNG && lng <= PAK_MAX_LNG) {
      return { lat, lng, display: item.display_name };
    }
  }
  return null;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

async function main() {
  let updatedSource = source;
  let corrected = 0;
  let skipped = 0;
  let failed = 0;
  let tooFar = 0;

  for (let i = 0; i < landmarks.length; i++) {
    const lm = landmarks[i];

    // Nominatim requires 1 req/sec
    await sleep(1050);

    let result = null;
    try {
      result = await geocodeNominatim(lm.name, lm.city);
    } catch (e) {
      console.error(`  Error for "${lm.name}": ${e.message}`);
      failed++;
      continue;
    }

    if (!result) {
      // Try just city + Pakistan
      await sleep(1050);
      try {
        result = await geocodeNominatim(lm.name, '');
      } catch (_) { /* ignore */ }
    }

    if (!result) {
      failed++;
      if (i % 20 === 0) console.log(`[${i+1}/${landmarks.length}] ✗ FAILED: ${lm.name}`);
      continue;
    }

    // Reject results more than 35km from original (probably wrong location)
    const distKm = haversineKm(lm.lat, lm.lng, result.lat, result.lng);
    if (distKm > 35) {
      tooFar++;
      console.log(`[${i+1}/${landmarks.length}] ⚠ TOO FAR (${distKm.toFixed(1)}km): ${lm.name} — skipping`);
      continue;
    }

    // Only update if > 100m off
    if (distKm < 0.1) {
      skipped++;
      if (i % 30 === 0) console.log(`[${i+1}/${landmarks.length}] = OK (${(distKm*1000).toFixed(0)}m): ${lm.name}`);
      continue;
    }

    // Apply correction
    const newEntry = lm.originalMatch
      .replace(/lat:\s*[\d.-]+/, `lat: ${result.lat.toFixed(6)}`)
      .replace(/lng:\s*[\d.-]+/, `lng: ${result.lng.toFixed(6)}`);

    updatedSource = updatedSource.replace(lm.originalMatch, newEntry);
    corrected++;
    console.log(`[${i+1}/${landmarks.length}] ✓ FIXED (${distKm.toFixed(2)}km off): ${lm.name}`);
    console.log(`         (${lm.lat}, ${lm.lng}) → (${result.lat.toFixed(6)}, ${result.lng.toFixed(6)})`);

    // Save every 100 landmarks
    if ((i + 1) % 100 === 0) {
      fs.writeFileSync(LANDMARKS_FILE, updatedSource, 'utf8');
      console.log(`\n💾 Progress saved [${i+1}/${landmarks.length}]\n`);
    }
  }

  fs.writeFileSync(LANDMARKS_FILE, updatedSource, 'utf8');
  console.log(`\n✅ Geocoding complete!`);
  console.log(`   ✓ Corrected: ${corrected}`);
  console.log(`   = Already accurate: ${skipped}`);
  console.log(`   ⚠ Too far (suspicious): ${tooFar}`);
  console.log(`   ✗ Failed (not found): ${failed}`);
}

main().catch(console.error);
