// Test local del webhook con firma válida.
// Generamos el signature HMAC SHA256 igual que MP y le pegamos al endpoint.
import crypto from 'node:crypto'

// Lee el secreto del webhook desde .env. Si no está, avisa y sale.
const SECRET = process.env.MP_WEBHOOK_SECRET
if (!SECRET) {
  console.error('Falta MP_WEBHOOK_SECRET en el entorno (.env).')
  console.error('Pegá el valor del panel de MP developers → tu app → Webhooks → Clave secreta.')
  process.exit(1)
}
const DATA_ID = '1234567890' // un payment_id de prueba
const REQUEST_ID = 'test-request-id-uuid-1234'
const TS = String(Math.floor(Date.now() / 1000))

// Mensaje a firmar: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
const message = `id:${DATA_ID};request-id:${REQUEST_ID};ts:${TS};`
const v1 = crypto.createHmac('sha256', SECRET).update(message).digest('hex')
const signature = `ts=${TS},v1=${v1}`

console.log('Message:', message)
console.log('Signature:', signature)
console.log('X-Request-Id:', REQUEST_ID)

// Ahora hacer el POST al webhook con headers correctos
const body = JSON.stringify({ type: 'payment', data: { id: DATA_ID } })

fetch('http://localhost:3000/api/mp/webhook', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-signature': signature,
    'x-request-id': REQUEST_ID,
  },
  body,
}).then(async (r) => {
  const text = await r.text()
  console.log('Status:', r.status)
  console.log('Response:', text.slice(0, 300))
}).catch((e) => console.error('Error:', e.message))
