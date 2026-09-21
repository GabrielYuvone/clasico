// Test con firma inválida - debe devolver 401
const body = JSON.stringify({ type: 'payment', data: { id: '1234567890' } })

fetch('http://localhost:3000/api/mp/webhook', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-signature': 'ts=12345,v1=0000000000000000000000000000000000000000000000000000000000000000',
    'x-request-id': 'whatever',
  },
  body,
}).then(async (r) => {
  const text = await r.text()
  console.log('Status:', r.status)
  console.log('Response:', text.slice(0, 300))
}).catch((e) => console.error('Error:', e.message))
