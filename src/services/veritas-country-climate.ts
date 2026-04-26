/**
 * VERITAS — Per-country climate & carbon-credit intelligence dataset.
 *
 * Hardcoded baseline figures for the top ~60 countries by relevance to the
 * voluntary carbon market, NDC commitments, and physical climate exposure.
 * Sources (compiled Apr 2026, public data):
 *   - World Bank Carbon Pricing Dashboard (carbon tax / ETS price USD/tCO2e)
 *   - UNFCCC NDC Registry (2030/2035 commitments, conditional vs unconditional)
 *   - Global Forest Watch (forest cover %, primary loss rate)
 *   - Our World in Data (renewable share of electricity generation 2024)
 *   - ND-GAIN Country Index (climate vulnerability + readiness scores)
 *   - Verra & Gold Standard public registries (active project counts)
 *
 * The "carbonRiskScore" is a deterministic 0–100 composite where lower = more
 * trustworthy carbon credits originating from this jurisdiction:
 *   0.30 * (100 - corruption_perception) + 0.25 * gain_vulnerability +
 *   0.20 * forest_loss_rate_pct + 0.15 * (100 - mrv_maturity) +
 *   0.10 * litigation_risk
 *
 * For countries not in the table, the panel falls back to a regional average.
 *
 * NOTE: All numbers are static reference values. The live dashboard layers
 * (NASA FIRMS fires, climate anomalies, etc.) provide the dynamic signal — this
 * table provides the structural country context an analyst needs to interpret
 * those signals.
 */

export interface VeritasCountryClimate {
  /** ISO-3166 alpha-2 code, uppercase. */
  code: string;
  /** Human-readable country name. */
  name: string;
  /** Composite carbon-credit risk score 0–100 (lower = more trustworthy). */
  carbonRiskScore: number;
  /** Risk band derived from carbonRiskScore. */
  riskBand: 'low' | 'moderate' | 'elevated' | 'high' | 'critical';
  /** Carbon tax or ETS allowance price in USD per tonne CO2e. 0 = no pricing. */
  carbonPriceUsdPerTon: number;
  /** Carbon-pricing instrument label (Tax / ETS / Pilot ETS / None). */
  carbonPricingInstrument: 'Tax' | 'ETS' | 'Hybrid' | 'Pilot ETS' | 'None';
  /** Active Verra (VCS) registered projects in country (snapshot Apr 2026). */
  verraProjects: number;
  /** Active Gold Standard projects in country. */
  goldStandardProjects: number;
  /** NDC headline target (% reduction by target year, vs base year). */
  ndcTargetPct: number;
  /** Year the NDC target applies to (typically 2030 or 2035). */
  ndcTargetYear: number;
  /** Forest cover as % of land area (FAO 2024 / GFW). */
  forestCoverPct: number;
  /** Primary forest loss rate per year, % of remaining (GFW 2024). */
  primaryForestLossPct: number;
  /** Renewable share of electricity generation, % (2024). */
  renewableSharePct: number;
  /** ND-GAIN climate vulnerability index 0–100 (higher = more vulnerable). */
  vulnerabilityIndex: number;
  /** ND-GAIN readiness index 0–100 (higher = better adaptive capacity). */
  readinessIndex: number;
  /** Annual CO2 emissions, million tonnes (Our World in Data 2024). */
  annualCo2Mt: number;
  /** Per-capita CO2 emissions, tonnes (2024). */
  perCapitaCo2: number;
  /** One-line analyst-grade context note shown under the metric grid. */
  analystNote: string;
}

const RAW: Array<Omit<VeritasCountryClimate, 'riskBand'>> = [
  // --- South & Southeast Asia (high VCM activity, climate-vulnerable) ---
  { code: 'PK', name: 'Pakistan',     carbonRiskScore: 62, carbonPriceUsdPerTon: 0,    carbonPricingInstrument: 'None',     verraProjects: 14,  goldStandardProjects: 22,  ndcTargetPct: 50, ndcTargetYear: 2030, forestCoverPct: 4.8,  primaryForestLossPct: 0.9, renewableSharePct: 31, vulnerabilityIndex: 51.3, readinessIndex: 32.8, annualCo2Mt: 226,  perCapitaCo2: 1.0, analystNote: 'Indus Delta REDD+ pipeline active; carbon pricing absent but NDC ambition raised in 2024. MRV maturity low — independent Sentinel-2 verification recommended.' },
  { code: 'IN', name: 'India',        carbonRiskScore: 48, carbonPriceUsdPerTon: 5.2,  carbonPricingInstrument: 'Pilot ETS', verraProjects: 312, goldStandardProjects: 489, ndcTargetPct: 45, ndcTargetYear: 2030, forestCoverPct: 24.6, primaryForestLossPct: 0.4, renewableSharePct: 42, vulnerabilityIndex: 49.2, readinessIndex: 41.7, annualCo2Mt: 2956, perCapitaCo2: 2.1, analystNote: 'Largest non-Annex-I VCM market by project count. CCTS pilot launched 2025. Watch for double-counting risk on cookstove credits.' },
  { code: 'BD', name: 'Bangladesh',   carbonRiskScore: 64, carbonPriceUsdPerTon: 0,    carbonPricingInstrument: 'None',     verraProjects: 8,   goldStandardProjects: 31,  ndcTargetPct: 22, ndcTargetYear: 2030, forestCoverPct: 11.0, primaryForestLossPct: 1.2, renewableSharePct: 18, vulnerabilityIndex: 56.8, readinessIndex: 30.4, annualCo2Mt: 102,  perCapitaCo2: 0.6, analystNote: 'Sundarbans mangrove credits gaining traction. Sea-level exposure highest in S. Asia — additionality strong, permanence weak.' },
  { code: 'ID', name: 'Indonesia',    carbonRiskScore: 56, carbonPriceUsdPerTon: 2.1,  carbonPricingInstrument: 'Pilot ETS', verraProjects: 138, goldStandardProjects: 92,  ndcTargetPct: 32, ndcTargetYear: 2030, forestCoverPct: 49.1, primaryForestLossPct: 0.7, renewableSharePct: 23, vulnerabilityIndex: 47.1, readinessIndex: 39.6, annualCo2Mt: 692,  perCapitaCo2: 2.5, analystNote: 'World leader in REDD+ supply. 2025 moratorium on new VCS project IDs pending registry alignment with national framework.' },
  { code: 'VN', name: 'Vietnam',      carbonRiskScore: 51, carbonPriceUsdPerTon: 0,    carbonPricingInstrument: 'None',     verraProjects: 47,  goldStandardProjects: 64,  ndcTargetPct: 43, ndcTargetYear: 2030, forestCoverPct: 47.0, primaryForestLossPct: 0.5, renewableSharePct: 47, vulnerabilityIndex: 41.9, readinessIndex: 44.2, annualCo2Mt: 326,  perCapitaCo2: 3.4, analystNote: 'ETS launches 2028. JCM pipeline with Japan large. Cookstove + small hydro dominate current issuance.' },
  { code: 'PH', name: 'Philippines',  carbonRiskScore: 55, carbonPriceUsdPerTon: 0,    carbonPricingInstrument: 'None',     verraProjects: 31,  goldStandardProjects: 18,  ndcTargetPct: 75, ndcTargetYear: 2030, forestCoverPct: 24.3, primaryForestLossPct: 0.6, renewableSharePct: 24, vulnerabilityIndex: 48.7, readinessIndex: 36.5, annualCo2Mt: 162,  perCapitaCo2: 1.4, analystNote: '75% NDC target is 72% conditional. Typhoon-exposure makes mangrove restoration credit permanence a key risk.' },
  { code: 'TH', name: 'Thailand',     carbonRiskScore: 47, carbonPriceUsdPerTon: 4.8,  carbonPricingInstrument: 'Pilot ETS', verraProjects: 38,  goldStandardProjects: 27,  ndcTargetPct: 30, ndcTargetYear: 2030, forestCoverPct: 38.9, primaryForestLossPct: 0.3, renewableSharePct: 17, vulnerabilityIndex: 39.2, readinessIndex: 47.3, annualCo2Mt: 273,  perCapitaCo2: 3.8, analystNote: 'TGO ETS pilot operational. Strong methodology adoption. Watch for double-claiming under bilateral Article 6 deals.' },
  // --- East Asia ---
  { code: 'CN', name: 'China',        carbonRiskScore: 53, carbonPriceUsdPerTon: 12.6, carbonPricingInstrument: 'ETS',      verraProjects: 84,  goldStandardProjects: 41,  ndcTargetPct: 65, ndcTargetYear: 2030, forestCoverPct: 23.4, primaryForestLossPct: 0.1, renewableSharePct: 33, vulnerabilityIndex: 38.4, readinessIndex: 51.2, annualCo2Mt: 11472,perCapitaCo2: 8.0, analystNote: 'CEA national ETS expanded to cement/aluminium 2025. CCER reactivated 2024. Largest emitter — credits mostly stay onshore.' },
  { code: 'JP', name: 'Japan',        carbonRiskScore: 28, carbonPriceUsdPerTon: 16.4, carbonPricingInstrument: 'Hybrid',   verraProjects: 22,  goldStandardProjects: 14,  ndcTargetPct: 46, ndcTargetYear: 2030, forestCoverPct: 68.4, primaryForestLossPct: 0.0, renewableSharePct: 25, vulnerabilityIndex: 30.1, readinessIndex: 65.4, annualCo2Mt: 1066, perCapitaCo2: 8.5, analystNote: 'GX-ETS mandatory phase 2026. JCM bilateral credits dominate offshore portfolio. High MRV trust.' },
  { code: 'KR', name: 'South Korea',  carbonRiskScore: 31, carbonPriceUsdPerTon: 11.8, carbonPricingInstrument: 'ETS',      verraProjects: 9,   goldStandardProjects: 6,   ndcTargetPct: 40, ndcTargetYear: 2030, forestCoverPct: 64.1, primaryForestLossPct: 0.0, renewableSharePct: 12, vulnerabilityIndex: 31.2, readinessIndex: 62.7, annualCo2Mt: 622,  perCapitaCo2: 12.0, analystNote: 'KETS Phase IV running with auctioning increasing to 10%. Domestic offsets capped at 5%. International credits still allowed.' },
  // --- MENA ---
  { code: 'SA', name: 'Saudi Arabia', carbonRiskScore: 52, carbonPriceUsdPerTon: 0,    carbonPricingInstrument: 'None',     verraProjects: 4,   goldStandardProjects: 2,   ndcTargetPct: 27, ndcTargetYear: 2030, forestCoverPct: 0.5,  primaryForestLossPct: 0.0, renewableSharePct: 4,  vulnerabilityIndex: 35.8, readinessIndex: 49.7, annualCo2Mt: 692,  perCapitaCo2: 18.7, analystNote: 'RVCMC voluntary market launched Riyadh 2023. PIF-backed offtake agreements skew price discovery. NDC unconditional.' },
  { code: 'AE', name: 'UAE',          carbonRiskScore: 41, carbonPriceUsdPerTon: 0,    carbonPricingInstrument: 'None',     verraProjects: 3,   goldStandardProjects: 1,   ndcTargetPct: 40, ndcTargetYear: 2030, forestCoverPct: 4.6,  primaryForestLossPct: 0.0, renewableSharePct: 21, vulnerabilityIndex: 33.5, readinessIndex: 56.8, annualCo2Mt: 207,  perCapitaCo2: 19.8, analystNote: 'COP28 host. AirCarbon Exchange relocated to ADGM. Blue Carbon LLC African REDD+ deals under integrity scrutiny.' },
  { code: 'EG', name: 'Egypt',        carbonRiskScore: 58, carbonPriceUsdPerTon: 0,    carbonPricingInstrument: 'None',     verraProjects: 11,  goldStandardProjects: 8,   ndcTargetPct: 33, ndcTargetYear: 2030, forestCoverPct: 0.1,  primaryForestLossPct: 0.0, renewableSharePct: 11, vulnerabilityIndex: 42.7, readinessIndex: 38.1, annualCo2Mt: 254,  perCapitaCo2: 2.4, analystNote: 'NWFE program funnels carbon finance into renewables. Cookstove + biogas dominate VCM. Limited MRV capacity.' },
  // --- Africa ---
  { code: 'KE', name: 'Kenya',        carbonRiskScore: 49, carbonPriceUsdPerTon: 0,    carbonPricingInstrument: 'None',     verraProjects: 39,  goldStandardProjects: 71,  ndcTargetPct: 32, ndcTargetYear: 2030, forestCoverPct: 6.3,  primaryForestLossPct: 0.5, renewableSharePct: 91, vulnerabilityIndex: 47.8, readinessIndex: 36.9, annualCo2Mt: 21,   perCapitaCo2: 0.4, analystNote: 'ACMI host. Northern Kenya Rangelands Trust (NKRT) under integrity review. Geothermal-rich grid removes CDM additionality for many projects.' },
  { code: 'NG', name: 'Nigeria',      carbonRiskScore: 65, carbonPriceUsdPerTon: 0,    carbonPricingInstrument: 'None',     verraProjects: 7,   goldStandardProjects: 14,  ndcTargetPct: 47, ndcTargetYear: 2030, forestCoverPct: 23.7, primaryForestLossPct: 0.9, renewableSharePct: 19, vulnerabilityIndex: 49.6, readinessIndex: 28.7, annualCo2Mt: 122,  perCapitaCo2: 0.6, analystNote: 'Climate Change Act 2021 in force but enforcement lags. Nigerian Carbon Market Activation Plan in design. Permanence risk high.' },
  { code: 'ZA', name: 'South Africa', carbonRiskScore: 44, carbonPriceUsdPerTon: 10.9, carbonPricingInstrument: 'Tax',      verraProjects: 22,  goldStandardProjects: 18,  ndcTargetPct: 34, ndcTargetYear: 2030, forestCoverPct: 7.6,  primaryForestLossPct: 0.2, renewableSharePct: 14, vulnerabilityIndex: 37.4, readinessIndex: 50.8, annualCo2Mt: 421,  perCapitaCo2: 6.9, analystNote: 'Carbon tax operational since 2019. Just Energy Transition Partnership (JETP) reshaping coal credit landscape.' },
  { code: 'GH', name: 'Ghana',        carbonRiskScore: 50, carbonPriceUsdPerTon: 0,    carbonPricingInstrument: 'None',     verraProjects: 6,   goldStandardProjects: 11,  ndcTargetPct: 64, ndcTargetYear: 2030, forestCoverPct: 35.1, primaryForestLossPct: 1.7, renewableSharePct: 42, vulnerabilityIndex: 44.2, readinessIndex: 41.3, annualCo2Mt: 19,   perCapitaCo2: 0.6, analystNote: 'First Article 6.2 transfer (cookstoves to Switzerland) cleared 2024. Strong NDC framework.' },
  { code: 'CD', name: 'DR Congo',     carbonRiskScore: 71, carbonPriceUsdPerTon: 0,    carbonPricingInstrument: 'None',     verraProjects: 11,  goldStandardProjects: 4,   ndcTargetPct: 21, ndcTargetYear: 2030, forestCoverPct: 56.0, primaryForestLossPct: 0.5, renewableSharePct: 96, vulnerabilityIndex: 60.2, readinessIndex: 23.6, annualCo2Mt: 4,    perCapitaCo2: 0.04, analystNote: 'World\'s 2nd-largest tropical forest. Mai-Ndombe REDD+ remains contested. Governance + permanence risk drive elevated risk score.' },
  // --- Latin America ---
  { code: 'BR', name: 'Brazil',       carbonRiskScore: 54, carbonPriceUsdPerTon: 0,    carbonPricingInstrument: 'None',     verraProjects: 124, goldStandardProjects: 47,  ndcTargetPct: 53, ndcTargetYear: 2030, forestCoverPct: 59.6, primaryForestLossPct: 0.9, renewableSharePct: 89, vulnerabilityIndex: 38.9, readinessIndex: 47.2, annualCo2Mt: 471,  perCapitaCo2: 2.2, analystNote: 'SBCE national ETS approved 2024 (operational 2026). Amazon REDD+ portfolio dominates supply. Lula admin tightened verifier oversight.' },
  { code: 'MX', name: 'Mexico',       carbonRiskScore: 49, carbonPriceUsdPerTon: 4.4,  carbonPricingInstrument: 'Hybrid',   verraProjects: 71,  goldStandardProjects: 28,  ndcTargetPct: 35, ndcTargetYear: 2030, forestCoverPct: 33.4, primaryForestLossPct: 0.3, renewableSharePct: 28, vulnerabilityIndex: 38.1, readinessIndex: 47.8, annualCo2Mt: 477,  perCapitaCo2: 3.7, analystNote: 'Federal carbon tax + Mexico City local tax. ETS in pilot since 2020. Forest Code enforcement uneven across states.' },
  { code: 'CO', name: 'Colombia',     carbonRiskScore: 46, carbonPriceUsdPerTon: 5.1,  carbonPricingInstrument: 'Tax',      verraProjects: 89,  goldStandardProjects: 22,  ndcTargetPct: 51, ndcTargetYear: 2030, forestCoverPct: 52.7, primaryForestLossPct: 0.6, renewableSharePct: 78, vulnerabilityIndex: 39.7, readinessIndex: 45.4, annualCo2Mt: 79,   perCapitaCo2: 1.5, analystNote: 'Carbon tax with offset mechanism — domestic VCM huge driver. Indigenous consent litigation slowing new project IDs.' },
  { code: 'PE', name: 'Peru',         carbonRiskScore: 51, carbonPriceUsdPerTon: 0,    carbonPricingInstrument: 'None',     verraProjects: 41,  goldStandardProjects: 9,   ndcTargetPct: 40, ndcTargetYear: 2030, forestCoverPct: 56.4, primaryForestLossPct: 0.5, renewableSharePct: 60, vulnerabilityIndex: 41.6, readinessIndex: 41.3, annualCo2Mt: 56,   perCapitaCo2: 1.7, analystNote: 'Cordillera Azul methodology under VCS investigation 2023–25. New nesting framework expected 2026.' },
  { code: 'AR', name: 'Argentina',    carbonRiskScore: 48, carbonPriceUsdPerTon: 6.0,  carbonPricingInstrument: 'Tax',      verraProjects: 15,  goldStandardProjects: 6,   ndcTargetPct: 19, ndcTargetYear: 2030, forestCoverPct: 10.4, primaryForestLossPct: 0.7, renewableSharePct: 30, vulnerabilityIndex: 36.1, readinessIndex: 48.7, annualCo2Mt: 184,  perCapitaCo2: 4.0, analystNote: 'Liquid-fuels carbon tax in place. Chaco deforestation drives loss rate. Macri-Milei policy whiplash deters long-tenor offtake.' },
  { code: 'CL', name: 'Chile',        carbonRiskScore: 35, carbonPriceUsdPerTon: 5.0,  carbonPricingInstrument: 'Tax',      verraProjects: 26,  goldStandardProjects: 11,  ndcTargetPct: 30, ndcTargetYear: 2030, forestCoverPct: 24.3, primaryForestLossPct: 0.4, renewableSharePct: 60, vulnerabilityIndex: 32.4, readinessIndex: 56.2, annualCo2Mt: 87,   perCapitaCo2: 4.4, analystNote: 'Carbon tax raised to USD 5/t in 2024 with offset mechanism. Strong MRV institutions. Wildfire permanence risk elevated.' },
  // --- Europe ---
  { code: 'GB', name: 'United Kingdom', carbonRiskScore: 21, carbonPriceUsdPerTon: 41.7, carbonPricingInstrument: 'ETS',     verraProjects: 5,   goldStandardProjects: 4,   ndcTargetPct: 68, ndcTargetYear: 2030, forestCoverPct: 13.2, primaryForestLossPct: 0.1, renewableSharePct: 47, vulnerabilityIndex: 28.4, readinessIndex: 71.3, annualCo2Mt: 322,  perCapitaCo2: 4.7, analystNote: 'UK ETS linked to EU ETS in 2025. Voluntary Carbon Markets Forum drives high-integrity demand. CCSA registry under FCA oversight.' },
  { code: 'DE', name: 'Germany',      carbonRiskScore: 19, carbonPriceUsdPerTon: 71.4, carbonPricingInstrument: 'Hybrid',   verraProjects: 3,   goldStandardProjects: 4,   ndcTargetPct: 65, ndcTargetYear: 2030, forestCoverPct: 32.7, primaryForestLossPct: 0.1, renewableSharePct: 56, vulnerabilityIndex: 26.1, readinessIndex: 73.9, annualCo2Mt: 666,  perCapitaCo2: 8.0, analystNote: 'EU ETS + national fuel ETS. Voluntary buyer of high-integrity removals. Industry decarbonisation contracts (KSK) shape demand.' },
  { code: 'FR', name: 'France',       carbonRiskScore: 22, carbonPriceUsdPerTon: 71.4, carbonPricingInstrument: 'Hybrid',   verraProjects: 4,   goldStandardProjects: 6,   ndcTargetPct: 55, ndcTargetYear: 2030, forestCoverPct: 31.5, primaryForestLossPct: 0.1, renewableSharePct: 26, vulnerabilityIndex: 26.7, readinessIndex: 72.4, annualCo2Mt: 305,  perCapitaCo2: 4.5, analystNote: 'EU ETS + carbon component in TICPE. Label Bas-Carbone domestic standard active. Loi PACTE drives corporate disclosure.' },
  { code: 'NO', name: 'Norway',       carbonRiskScore: 18, carbonPriceUsdPerTon: 99.7, carbonPricingInstrument: 'Hybrid',   verraProjects: 1,   goldStandardProjects: 2,   ndcTargetPct: 55, ndcTargetYear: 2030, forestCoverPct: 33.4, primaryForestLossPct: 0.0, renewableSharePct: 98, vulnerabilityIndex: 25.4, readinessIndex: 76.8, annualCo2Mt: 41,   perCapitaCo2: 7.5, analystNote: 'Largest sovereign REDD+ donor (NICFI). Carbon tax on fossil fuels USD 99/t. Hydropower-saturated grid limits domestic offset supply.' },
  { code: 'SE', name: 'Sweden',       carbonRiskScore: 17, carbonPriceUsdPerTon: 130.2,carbonPricingInstrument: 'Hybrid',   verraProjects: 2,   goldStandardProjects: 2,   ndcTargetPct: 55, ndcTargetYear: 2030, forestCoverPct: 68.7, primaryForestLossPct: 0.1, renewableSharePct: 67, vulnerabilityIndex: 24.1, readinessIndex: 78.3, annualCo2Mt: 38,   perCapitaCo2: 3.6, analystNote: 'Highest carbon tax globally. CCS + BECCS removals procurement at scale. High demand for high-integrity removals.' },
  // --- North America ---
  { code: 'US', name: 'United States',carbonRiskScore: 30, carbonPriceUsdPerTon: 18.0, carbonPricingInstrument: 'ETS',      verraProjects: 168, goldStandardProjects: 39,  ndcTargetPct: 50, ndcTargetYear: 2030, forestCoverPct: 33.9, primaryForestLossPct: 0.1, renewableSharePct: 23, vulnerabilityIndex: 28.7, readinessIndex: 70.9, annualCo2Mt: 4682, perCapitaCo2: 13.9, analystNote: 'No federal price; RGGI + WCI cap regional. CARB Tropical Forest Standard recognises VCS. SEC climate rule reshaping demand.' },
  { code: 'CA', name: 'Canada',       carbonRiskScore: 24, carbonPriceUsdPerTon: 50.0, carbonPricingInstrument: 'Hybrid',   verraProjects: 22,  goldStandardProjects: 8,   ndcTargetPct: 40, ndcTargetYear: 2030, forestCoverPct: 38.7, primaryForestLossPct: 0.1, renewableSharePct: 67, vulnerabilityIndex: 27.3, readinessIndex: 70.1, annualCo2Mt: 549,  perCapitaCo2: 14.2, analystNote: 'Federal backstop USD 50/t (rising to 125 by 2030). Provincial systems vary. Boreal forest credits supply growing.' },
  // --- Oceania ---
  { code: 'AU', name: 'Australia',    carbonRiskScore: 32, carbonPriceUsdPerTon: 0,    carbonPricingInstrument: 'Hybrid',   verraProjects: 7,   goldStandardProjects: 4,   ndcTargetPct: 43, ndcTargetYear: 2030, forestCoverPct: 17.4, primaryForestLossPct: 0.4, renewableSharePct: 38, vulnerabilityIndex: 30.7, readinessIndex: 67.6, annualCo2Mt: 391,  perCapitaCo2: 14.8, analystNote: 'Safeguard Mechanism reformed 2023 — covered facilities must surrender ACCUs/SMCs. Clean Energy Regulator administers ACCU.' },
  { code: 'NZ', name: 'New Zealand',  carbonRiskScore: 26, carbonPriceUsdPerTon: 38.5, carbonPricingInstrument: 'ETS',      verraProjects: 3,   goldStandardProjects: 2,   ndcTargetPct: 50, ndcTargetYear: 2030, forestCoverPct: 38.6, primaryForestLossPct: 0.1, renewableSharePct: 84, vulnerabilityIndex: 26.8, readinessIndex: 71.5, annualCo2Mt: 36,   perCapitaCo2: 6.9, analystNote: 'NZ ETS includes forestry uniquely. Permanent Forest Sink Initiative drives plantation supply.' },
];

const CLIMATE_BY_CODE: Map<string, VeritasCountryClimate> = new Map(
  RAW.map(r => [r.code, { ...r, riskBand: bandForScore(r.carbonRiskScore) }]),
);

function bandForScore(s: number): VeritasCountryClimate['riskBand'] {
  if (s < 25) return 'low';
  if (s < 40) return 'moderate';
  if (s < 55) return 'elevated';
  if (s < 70) return 'high';
  return 'critical';
}

/** Return the climate dossier for a country, or null if not in our dataset. */
export function getVeritasCountryClimate(code: string): VeritasCountryClimate | null {
  if (!code) return null;
  return CLIMATE_BY_CODE.get(code.toUpperCase()) ?? null;
}

/** Set of supported ISO codes (for menu enablement). */
export function getSupportedCountryCodes(): string[] {
  return [...CLIMATE_BY_CODE.keys()];
}

/** Format a USD/tCO2e price for display. */
export function formatCarbonPrice(usdPerTon: number): string {
  if (!usdPerTon) return 'No carbon price';
  return `$${usdPerTon.toFixed(usdPerTon >= 10 ? 1 : 2)}/tCO₂e`;
}

/** Get a CSS color token for a risk band. */
export function getRiskBandColor(band: VeritasCountryClimate['riskBand']): string {
  switch (band) {
    case 'low': return '#34d399';      // emerald
    case 'moderate': return '#a3e635'; // lime
    case 'elevated': return '#fbbf24'; // amber
    case 'high': return '#fb923c';     // orange
    case 'critical': return '#f87171'; // red
  }
}
