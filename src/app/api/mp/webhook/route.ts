import { NextResponse } from 'next/server'
import crypto from 'node:crypto'

export const dynamic = 'force-dynamic'
// MP nos manda POST. No queremos que Next le agregue CSRF ni nada.
export const fetchCache = 'force-no-store'

// POST /api/mp/webhook
// Recibe el aviso de Mercado Pago. MP manda notificaciones de tipo:
//   - "payment": trae el ID del pago. Hay que ir a buscar los detalles a MP
//     con el ACCESS_TOKEN y marcar la Purchase correspondiente como pagada
//     si el status es "approved".
//   - "merchant_order": trae la orden que agrupa varios pagos. Para nuestro
//     caso (Checkout Pro simple) llega el "payment" primero.
//   - "topic" / "action" alternativos para otros esquemas.
//
// Verificación de firma (esquema manifest de MP):
//   Headers: x-signature="ts=<unix>,v1=<hex>" + x-request-id="<uuid>"
//   Mensaje a firmar: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
//   HMAC SHA256 con MP_WEBHOOK_SECRET.
//   Ver: https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks/webhooks-signature
export async function POST(req: Request) {
  const verify = String(process.env.MP_WEBHOOK_VERIFY ?? 'true') !== 'false'

  // Log de diagnóstico: registramos todos los headers y el body crudo para
  // poder depurar si MP manda algo distinto a lo esperado.
  const headers: Record<string, string> = {}
  req.headers.forEach((value, key) => {
    if (key.toLowerCase().startsWith('x-') || key.toLowerCase() === 'content-type') {
      headers[key] = value
    }
  })
  console.log('[mp/webhook] request incoming', { headers, verify })

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
  // data.id puede ser numérico o string. Lo normalizamos a string.
  const dataIdRaw = body?.data?.id ?? body?.resource ?? body?.id
  const dataId = dataIdRaw != null ? String(dataIdRaw) : null

  // Si es merchant_order, no nos interesa procesarlo acá (esperamos el
  // payment). Respondemos 200 para que MP no reintente.
  if (type === 'merchant_order' || type === 'merchant_order.updated') {
    return NextResponse.json({ ok: true, ignored: 'merchant_order' })
  }

  // Si no es "payment" ni tenemos dataId, igual respondemos 200 (MP
  // reintenta si devolvés 4xx/5xx, y nos saturaría la cola).
  if (type !== 'payment' && !dataId) {
    return NextResponse.json({ ok: true, ignored: 'unknown' })
  }
  if (!dataId) {
    return NextResponse.json({ ok: true, ignored: 'no_id' })
  }

  // ---- Verificación de firma ----
  if (verify) {
    const sig = req.headers.get('x-signature') || req.headers.get('X-Signature')
    const reqId = req.headers.get('x-request-id') || req.headers.get('X-Request-Id')
    const manifestSecret = process.env.MP_WEBHOOK_SECRET

    if (!sig || !reqId || !manifestSecret) {
      // Sin firma o sin secreto: en producción RECHAZAMOS (401). En dev permitimos
      // pasar si explícitamente se setea MP_WEBHOOK_VERIFY=false.
      console.warn('[mp/webhook] falta signature, request-id o secreto', { sig: !!sig, reqId: !!reqId, secret: !!manifestSecret })
      return NextResponse.json({ ok: false, error: 'firma requerida' }, { status: 401 })
    }

    // Parseo "ts=...,v1=..."
    const parts: Record<string, string> = {}
    for (const kv of sig.split(',')) {
      const idx = kv.indexOf('=')
      if (idx > -1) parts[kv.slice(0, idx).trim()] = kv.slice(idx + 1).trim()
    }
    const ts = parts.ts
    const v1 = parts.v1
    if (!ts || !v1) {
      console.warn('[mp/webhook] signature mal formada', sig)
      return NextResponse.json({ ok: false, error: 'firma inválida' }, { status: 401 })
    }

    // Mensaje a firmar según doc oficial de MP:
    //   "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
    const message = `id:${dataId};request-id:${reqId};ts:${ts};`
    const hmac = crypto.createHmac('sha256', manifestSecret).update(message).digest('hex')
    // Comparación en tiempo constante para evitar timing attacks. Requiere
    // buffers de la misma longitud, así que normalizamos v1 a hex lowercase
    // y comparamos longitudes primero (si difieren, la firma es inválida).
    const v1Hex = v1.toLowerCase()
    if (v1Hex.length !== hmac.length || !crypto.timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(v1Hex, 'hex'))) {
      console.warn('[mp/webhook] firma no coincide', { expected: hmac, got: v1Hex, message })
      return NextResponse.json({ ok: false, error: 'firma no coincide' }, { status: 401 })
    }
  }

  // ---- Verificado el origen. Ahora a buscar el pago a MP ----
  const token = process.env.MP_ACCESS_TOKEN
  if (!token) {
    console.error('[mp/webhook] MP_ACCESS_TOKEN no configurado')
    return NextResponse.json({ ok: false, error: 'sin token' }, { status: 500 })
  }

  const payRes = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!payRes.ok) {
    console.warn('[mp/webhook] no se pudo obtener el pago', dataId, payRes.status)
    // 502 para que MP reintente más tarde (el pago puede existir pero MP
    // puede tardar en propagarlo).
    return NextResponse.json({ ok: false, error: 'no se pudo obtener el pago' }, { status: 502 })
  }
  const pay = await payRes.json()
  const status: string = pay.status // "approved" | "rejected" | "pending" | "in_process" | "cancelled"
  const externalRef: string | null = pay.external_reference
  if (!externalRef) {
    console.warn('[mp/webhook] pago sin external_reference', dataId)
    return NextResponse.json({ ok: true, ignored: 'no_external_ref' })
  }

  // ---- Actualizar la Purchase según el estado ----
  const { db } = await import('@/lib/db')
  const nuevoEstado =
    status === 'approved' ? 'pagada' :
    status === 'rejected' || status === 'cancelled' ? 'rechazada' :
    'pendiente'
  const update: any = {
    mpPaymentId: String(dataId),
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

  console.log(`[mp/webhook] pago ${dataId} status=${status} → purchase ${externalRef} estado=${nuevoEstado} club=${purchase?.club?.nombre}`)

  return NextResponse.json({ ok: true, status, estado: nuevoEstado })
}

// MP a veces hace un GET para validar la URL.
export async function GET() {
  return NextResponse.json({ ok: true, service: 'la-tribuna-mp-webhook' })
}
