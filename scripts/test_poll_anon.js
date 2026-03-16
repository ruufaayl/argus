async function testPollinationsAnon() {
  const res = await fetch('https://text.pollinations.ai/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'Say hello in JSON format {"hello": "world"}' }],
      jsonMode: true
    })
  });
  console.log('Status:', res.status);
  console.log('Text:', await res.text());
}
testPollinationsAnon();
