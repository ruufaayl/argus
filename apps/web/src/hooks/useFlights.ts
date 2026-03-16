// ============================================================
// useFlights — Mock flight data for Pakistan airspace
// ============================================================

import { useState, useEffect, useRef } from 'react';
import type { FlightEntity } from '../stores/commandStore';
import { useCommandStore } from '../stores/commandStore';

// Proxy through backend
const API_URL = '/api/flights';

export function useFlights(): FlightEntity[] {
  const [flights, setFlights] = useState<FlightEntity[]>([]);
  const setFlightCounts = useCommandStore((s) => s.setFlightCounts);
  const flightsRef = useRef<FlightEntity[]>([]);

  useEffect(() => {
    let isSubscribed = true;

    const fetchFlights = async () => {
      try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();
        
        if (data && data.states && isSubscribed) {
          const newFlights: FlightEntity[] = data.states.map((s: any) => {
            const icao24 = s[0] || '';
            const callsign = s[1] ? s[1].trim() : '';
            const onGround = s[8] === true;
            const velocityKts = (s[9] || 0) * 1.94384; 
            
            // Heuristic for military (OpenSky rarely gives clear military ID, 
            // so we guess based on missing callsigns or specific prefixes if any, 
            // but keep it mostly civil for realism unless we spot something).
            const isMilitary = callsign.startsWith('PAF') || callsign.startsWith('RSAF') || (!callsign && s[2] === 'Pakistan');
            
            return {
              id: callsign || icao24,
              callsign: callsign,
              icao24: icao24,
              lon: s[5] || 0,
              lat: s[6] || 0,
              altitude: s[7] || s[13] || 0,
              velocity: velocityKts,
              heading: s[10] || 0,
              verticalRate: s[11] || 0,
              onGround: onGround,
              source: 'opensky',
              isMilitary: isMilitary,
              squawk: s[14] || ''
            };
          });

          // Filter out planes with missing coords
          const validFlights = newFlights.filter(f => f.lat !== 0 && f.lon !== 0);
          
          flightsRef.current = validFlights;
          setFlights(validFlights);
          setFlightCounts(validFlights.length, validFlights.filter(f => f.isMilitary).length);
        }
      } catch (error) {
        console.error("OpenSky fetch failed:", error);
      }
    };

    // Interpolation loop to make planes glide between the 10-second API updates
    const interpolateInterval = setInterval(() => {
      setFlights(current => current.map(f => {
        // Increment physics based on velocity (knots) and heading
        // 1 knot = 1.852 km/h. Running tick every 1 second.
        if (f.onGround || f.velocity <= 0) return f;
        
        const distanceKm = (f.velocity * 1.852 / 3600) * 1;
        const distanceDeg = distanceKm / 111.0; 
        const hdgRad = (Math.PI / 180) * (90 - f.heading);
        const dLat = Math.sin(hdgRad) * distanceDeg;
        const dLon = Math.cos(hdgRad) * distanceDeg;

        return {
          ...f,
          lat: f.lat + dLat,
          lon: f.lon + dLon
        };
      }));
    }, 1000);

    fetchFlights();
    const fetchInterval = setInterval(fetchFlights, 10000); // 10s fetch

    return () => {
      isSubscribed = false;
      clearInterval(fetchInterval);
      clearInterval(interpolateInterval);
    };
  }, [setFlightCounts]);

  return flights;
}
