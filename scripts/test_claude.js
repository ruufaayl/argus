const fs = require('fs');
const path = require('path');
const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
let key = '';
for (const line of envContent.split('\n')) {
  if (line.trim().startsWith('CLAUDE_API_KEY=')) {
    key = line.split('=')[1].trim();
  }
}

async function test() {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'hello' }]
    })
  });
  
  if (!res.ok) {
    console.log(await res.text());
  } else {
    console.log('Success:', await res.json());
  }
}

test();
