async function test() {
  try {
    const res = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: 'You are a helpful AI.' },
          { role: 'user', content: 'Say hello world in json: {"msg": "hello world"}' }
        ],
        jsonMode: true
      })
    });
    
    if (!res.ok) {
      console.log('Error:', await res.text());
    } else {
      console.log('Success:', await res.text());
    }
  } catch(e) {
    console.error(e);
  }
}

test();
