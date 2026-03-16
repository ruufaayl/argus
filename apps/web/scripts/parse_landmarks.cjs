const fs = require('fs');
const path = require('path');

const rawPath = path.join(__dirname, '../src/data/raw_landmarks.json');
const outPath = path.join(__dirname, '../src/data/landmarks.ts');

const rawData = fs.readFileSync(rawPath, 'utf8');

const lines = rawData.split('\n');
const landmarks = [];
let currentCategory = '';

for (const line of lines) {
  const trimmed = line.trim();
  
  if (trimmed.startsWith('## ')) {
    const rawCat = trimmed.toLowerCase();
    if (rawCat.includes('government')) currentCategory = 'government';
    if (rawCat.includes('military')) currentCategory = 'military';
    if (rawCat.includes('transport')) currentCategory = 'transport';
    if (rawCat.includes('commercial')) currentCategory = 'commercial';
    if (rawCat.includes('education')) currentCategory = 'education';
    if (rawCat.includes('healthcare')) currentCategory = 'healthcare';
    if (rawCat.includes('religious')) currentCategory = 'religious';
    if (rawCat.includes('tourism')) currentCategory = 'tourism';
    if (rawCat.includes('heritage')) currentCategory = 'tourism';
    if (rawCat.includes('industrial')) currentCategory = 'industrial';
    if (rawCat.includes('residential')) currentCategory = 'residential';
    if (rawCat.includes('media')) currentCategory = 'media';
    if (rawCat.includes('telecom')) currentCategory = 'media';
  } else if (trimmed.startsWith('|') && !trimmed.includes('Site Name') && !trimmed.includes('---')) {
    const parts = trimmed.split('|').map(p => p.trim()).filter(Boolean);
    if (parts.length >= 7 && !isNaN(parseInt(parts[0]))) {
      // parts: [Id, Site Name, City, Province, Tier, Lat, Lng]
      const name = parts[1].replace(/"/g, '\\"');
      const city = parts[2];
      const province = parts[3];
      const tier = parts[4];
      const lat = parseFloat(parts[5]);
      const lng = parseFloat(parts[6]);
      
      landmarks.push(`  { name: "${name}", city: '${city}', province: '${province}', tier: '${tier}', lat: ${lat}, lng: ${lng}, category: '${currentCategory}' },`);
    }
  }
}

const headerLines = [
  "// ============================================================",
  "// Pakistan Landmarks \u2014 1,100 Strategic Sites (11 Categories)",
  "// ============================================================",
  "// Each entry: { name, city, province, tier, lat, lng, category }",
  "// Categories: government, military, transport, commercial,",
  "//             education, healthcare, religious, tourism,",
  "//             industrial, residential, media",
  "",
  "export interface Landmark {",
  "  name: string;",
  "  city: string;",
  "  province: string;",
  "  tier: 'T1' | 'T2' | 'T3';",
  "  lat: number;",
  "  lng: number;",
  "  category: string;",
  "}",
  "",
  "// Category render config",
  "export const CATEGORY_CONFIG: Record<string, { color: string; icon: string; label: string }> = {",
  "  government:  { color: '#4A9EFF', icon: '\uD83C\uDFDB', label: 'Government' },",
  "  military:    { color: '#FFB800', icon: '\uD83E\uDE96', label: 'Military' },",
  "  transport:   { color: '#00C8FF', icon: '\u2708', label: 'Transport' },",
  "  commercial:  { color: '#B8B8B8', icon: '\uD83C\uDFE2', label: 'Commercial' },",
  "  education:   { color: '#9B59B6', icon: '\uD83C\uDF93', label: 'Education' },",
  "  healthcare:  { color: '#FF3040', icon: '\uD83C\uDFE5', label: 'Healthcare' },",
  "  religious:   { color: '#F39C12', icon: '\uD83D\uDD4C', label: 'Religious' },",
  "  tourism:     { color: '#00FF88', icon: '\uD83D\uDCCD', label: 'Tourism' },",
  "  industrial:  { color: '#95A5A6', icon: '\uD83C\uDFED', label: 'Industrial' },",
  "  residential: { color: '#1ABC9C', icon: '\uD83C\uDFD8', label: 'Residential' },",
  "  media:       { color: '#E74C3C', icon: '\uD83D\uDCE1', label: 'Media/Telecom' },",
  "};",
  "",
  "export const LANDMARKS: Landmark[] = [",
]

const footerLines = [
  "];",
  ""
];

const totalContent = headerLines.join('\n') + '\n' + landmarks.join('\n') + '\n' + footerLines.join('\n');

fs.writeFileSync(outPath, totalContent, 'utf8');

console.log(`Parsed ${landmarks.length} landmarks. Wrote to ${outPath}`);
