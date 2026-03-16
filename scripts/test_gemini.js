const fs = require('fs');
const path = require('path');
const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
let key = '';
for (const line of envContent.split('\n')) {
  if (line.trim().startsWith('VITE_GEMINI_API_KEY=')) {
    key = line.split('=')[1].trim();
  }
}

async function test() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.models) {
    console.log('Available models:', data.models.map(m => m.name));
  } else {
    console.log('Error fetching models:', data);
  }
}

test();
