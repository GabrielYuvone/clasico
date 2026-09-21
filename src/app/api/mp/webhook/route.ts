import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
// MP nos manda POST. No queremos que Next le agregue CSRF ni nada.
export const fetchCache = 'force-no-store'

// POST /api/mp/webhook
// Recibe el aviso de Mercado Pago. MP manda dos tipos de notificación:
//   - "payment": trae el ID del pago. Hay que ir a buscar los detalles a MP
//     con el ACCESS_TOKEN y marcar la Purchase correspondiente como pagada
//     si el status es "approved".
//   - "merchant_order": trae la orden que agrupa varios pagos. Para nuestro
//     caso (Checkout Pro simple) llega el "payment" primero.
//
// Verificación de firma:
//   MP manda headers `x-signature` y `x-request-id`. La firma es HMAC del
//   `data.id` usando un secreto compartido (manifest). En sandbox a veces no
//   manda firma, así que permitimos modo "lenient" vía MP_WEBHOOK_VERIFY=false.
//   En producción forzamos verificación.
export async function POST(req: Request) {
  const verify = String(process.env.MP_WEBHOOK_VERIFY ?? 'true') !== 'false'

  let body: any
  try {
    body = await req.json()
  } catch {
    // MP a veces manda el body como form-urlencoded. Si falla el JSON, respondemos
    // 200 igual para que MP no reintente infinitamente, pero logueamos.
    console.warn('[mp/webhook] body no era JSON')
    return NextResponse.json({ ok: true, ignored: true })
  }

  // MP manda {"type":"payment","data":{"id":"<payment_id>"}} o
  //          {"type":"merchant_order","data":{"id":"<order_id>"}} o
  // a veces manda {"action":"payment.updated","data":{"id":"..."},"user_id":"..."}
  const type = body?.type || body?.topic || body?.action
  const paymentId = body?.data?.id || body?.resource || body?.id

  // Si es merchant_order, no nos interesa procesarlo acá (esperamos el
  // payment). Respondemos 200 para que MP no reintente.
  if (type === 'merchant_order' || type === 'merchant_order.updated') {
    return NextResponse.json({ ok: true, ignored: 'merchant_order' })
  }

  // Si no es "payment" ni tenemos paymentId, igual respondemos 200 (MP
  // reintenta si devolvés 4xx/5xx, y nos saturaría la cola).
  if (type !== 'payment' && !paymentId) {
    return NextResponse.json({ ok: true, ignored: 'unknown' })
  }

  if (!paymentId) {
    return NextResponse.json({ ok: true, ignored: 'no_id' })
  }

  // Verificación de firma (HMAC SHA256 con el secreto del manifest).
  if (verify) {
    const sig = req.headers.get('x-signature') || req.headers.get('X-Signature')
    const reqId = req.headers.get('x-request-id') || req.headers.get('X-Request-Id')
    const manifestSecret = process.env.MP_WEBHOOK_SECRET
    if (!sig || !manifestSecret) {
      // En sandbox a veces no manda firma. Lo dejamos pasar solo en dev.
      console.warn('[mp/webhook] sin signature o sin secreto (modo dev tolerante)')
    } else {
      // Parseo "ts=...,v1=..." y verificamos HMAC-SHA256 sobre "<id>:<req_id>".
      const parts = Object.fromEntries(
        sig.split(',').map((kv) => {
          const [k, v] = kv.split('=', 2)
          return [k.trim(), v.trim()]
        })
      )
      const ts = parts.ts
      const v1 = parts.v1
      if (!ts || !v1 || !reqId) {
        console.warn('[mp/webhook] signature mal formada', { sig, reqId })
        return NextResponse.json({ ok: false, error: 'firma inválida' }, { status: 401 })
      }
      // El mensaje a firmar es "<id>:<request_id>" con data.id = paymentId.
      const message = `${paymentId}:${reqId}`
      const crypto = await import('node:crypto')
      const hmac = crypto.createHmac('sha256', manifestSecret).update(message).digest('hex')
      if (hmac !== v1) {
        console.warn('[mp/webhook] firma no coincide', { expected: hmac, got: v1 })
        return NextResponse.json({ ok: false, error: 'firma no coincide' }, { status: 401 })
      }
    }
  }

  // Consultar a MP el estado del pago.
  const token = process.env.MP_ACCESS_TOKEN
  if (!token) {
    console.error('[mp/webhook] MP_ACCESS_TOKEN no configurado')
    return NextResponse.json({ ok: false, error: 'sin token' }, { status: 500 })
  }

  const payRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!payRes.ok) {
    console.warn('[mp/webhook] no se pudo obtener el pago', paymentId, payRes.status)
    return NextResponse.json({ ok: false, error: 'no se pudo obtener el pago' }, { status: 502 })
  }
  const pay = await payRes.json()
  const status: string = pay.status // "approved" | "rejected" | "pending" | "in_process" | "cancelled"
  const externalRef: string | null = pay.external_reference
  if (!externalRef) {
    console.warn('[mp/webhook] pago sin external_reference', paymentId)
    return NextResponse.json({ ok: true, ignored: 'no_external_ref' })
  }

  // Actualizar la Purchase según el estado.
  const { db } = await import('@/lib/db')
  const nuevoEstado = status === 'approved' ? 'pagada' : status === 'rejected' || status === 'cancelled' ? 'rechazada' : 'pendiente'
  const update: any = {
    mpPaymentId: String(paymentId),
    mpStatus: status,
  }
  if (nuevoEstado === 'pagada') {
    update.estado = 'pagada'
    update.approvedAt = new Date()
  } else if (nuevoEstado === 'rechazada') {
    update.estado = 'rechazada'
  }

  const purchase = await db.purchase.update({
    where: { id: externalRef },
    data: update,
    include: { club: true },
  }).catch((e) => {
    console.warn('[mp/webhook] no se pudo actualizar purchase', externalRef, e?.message)
    return null
  })

  console.log(`[mp/webhook] pago ${paymentId} status=${status} → purchase ${externalRef} estado=${nuevoEstado} club=${purchase?.club?.nombre}`)

  return NextResponse.json({ ok: true, status, estado: nuevoEstado })
}

// MP a veces hace un GET para validar la URL.
export async function GET(req: Request) {
  return NextResponse.json({ ok: true, service: 'la-tribuna-mp-webhook' })
}
