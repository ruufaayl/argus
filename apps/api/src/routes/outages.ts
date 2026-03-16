// ============================================================
// Outages Route — Pakistan Sentinel
// Simulated real-time power grid outages by district for live feed
// ============================================================

import { Hono } from 'hono';

const app = new Hono();

// Plausible districts for realistic simulation
const DISTRICTS = {
  karachi: ['DHA Phase 6', 'Clifton Block 4', 'Lyari', 'Orangi Town', 'Korangi Industrial Area', 'SITE', 'Nazimabad', 'Gulshan-e-Iqbal'],
  lahore: ['Johar Town', 'DHA Phase 5', 'Model Town', 'Walled City', 'Gulberg III', 'Iqbal Town', 'Samanabad'],
  islamabad: ['G-11', 'F-8', 'I-10', 'E-11', 'G-8', 'G-13', 'H-13'],
  rawalpindi: ['Satellite Town', 'Saddar', 'Commercial Market', 'Bahria Phase 4', 'DHA Phase 1', 'Westridge'],
};

// Deterministic mock generation based on hour of day
app.get('/', (c) => {
  const cityId = c.req.query('city') || 'karachi';
  const districts = DISTRICTS[cityId as keyof typeof DISTRICTS] || DISTRICTS.karachi;
  
  const now = new Date();
  const hour = now.getUTCHours();
  
  // Use hour as seed so outages rotate plausibly over the day
  // but remain stable within the same hour
  const seed = hour * 17 + (cityId.length * 3);
  
  const activeOutages = [];
  const numOutages = (seed % 4) + 1; // 1 to 4 outages
  
  for (let i = 0; i < numOutages; i++) {
    const districtIdx = (seed + i * 7) % districts.length;
    const duration = ((seed + i) % 4) + 1; // 1-4 hours
    
    // Time the outage started (varies from 10 to 110 mins ago)
    const minsAgo = ((seed + i * 13) % 100) + 10;
    const startTime = Date.now() - (minsAgo * 60 * 1000);
    
    let severity = 'warning';
    if (duration >= 3) severity = 'critical';
    if (districts[districtIdx].includes('Industrial') || districts[districtIdx].includes('SITE')) {
      severity = 'critical';
    }
    
    activeOutages.push({
      id: `outage-${cityId}-${districtIdx}-${hour}`,
      district: districts[districtIdx],
      durationHours: duration,
      startTime,
      severity
    });
  }

  return c.json({
    cityId,
    timestamp: Date.now(),
    activeOutages,
    gridStress: Math.min(100, 30 + (numOutages * 15) + (hour % 10)) // 30-100%
  });
});

export default app;
