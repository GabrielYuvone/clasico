import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

const CAPACIDAD = 100000
const MAX_POR_COMPRA = 2000
const PRECIO = 100 // ARS por hincha. Debería leerse de /api/config pero para
                  // una preferencia de MP necesitamos un número estable.

// POST /api/mp/preference
// Body: { slug, cantidad, nombre?, mensaje? }
// Crea una preferencia de pago en Mercado Pago y devuelve el `init_point`
// (URL de Checkout Pro a la que hay que redirigir al usuario) y el
// `mpPreferenceId` interno de MP, que guardamos en la Purchase para después
// poder cruzarla con el webhook.
//
// La Purchase arranca en estado "pendiente". Cuando MP nos mande el webhook
// con status="approved" la marcaremos como "pagada" automáticamente.
export async function POST(req: Request) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 })
  }

  const slug = String(body.slug || '').trim()
  const cantidad = Math.floor(Number(body.cantidad) || 0)
  const nombre = body.nombre ? String(body.nombre).trim().slice(0, 40) : null
  const mensaje = body.mensaje ? String(body.mensaje).trim().slice(0, 140) : null

  if (!slug) return NextResponse.json({ ok: false, error: 'Falta el club' }, { status: 400 })
  if (!cantidad || cantidad < 1)
    return NextResponse.json({ ok: false, error: 'Cantidad inválida' }, { status: 400 })
  if (cantidad > MAX_POR_COMPRA)
    return NextResponse.json({ ok: false, error: `Máximo ${MAX_POR_COMPRA} por compra` }, { status: 400 })

  const club = await db.club.findUnique({ where: { slug } })
  if (!club) return NextResponse.json({ ok: false, error: 'Club inexistente' }, { status: 404 })

  // Control de aforo: contar SOLO las pagadas.
  const total = await db.purchase.aggregate({
    _sum: { cantidad: true },
    where: { estado: 'pagada' },
  })
  const ocupadas = total._sum.cantidad ?? 0
  const libres = Math.max(0, CAPACIDAD - ocupadas)
  if (cantidad > libres) {
    return NextResponse.json({ ok: false, error: `Solo quedan ${libres} lugares` }, { status: 409 })
  }

  // 1. Crear la Purchase en estado pendiente. La usamos como external_reference
  //    para que el webhook sepa a qué compra corresponde el pago.
  const purchase = await db.purchase.create({
    data: {
      clubId: club.id,
      cantidad,
      nombre,
      mensaje,
      estado: 'pendiente',
      amigo: false,
    },
  })

  // 2. Crear la preferencia en MP.
  const totalAmount = PRECIO * cantidad
  const description = `${cantidad} hincha${cantidad === 1 ? '' : 's'} para ${club.nombre} · La Tribuna`

  // URL del webhook: si MP_WEBHOOK_URL está seteado lo usamos; si no, usamos
  // el host del request. En preview, el host del request es el correcto.
  const url = new URL(req.url)
  const webhookUrl = process.env.MP_WEBHOOK_URL
    || `${url.protocol}//${url.host}/api/mp/webhook`

  // URLs de retorno. Para que auto_return funcione, success tiene que ser
  // distinto de pending/failure. Les ponemos querystrings distintos para
  // que el front sepa de dónde viene el usuario (pago ok, pendiente, fallado).
  const backUrl = `${url.protocol}//${url.host}/`
  const successUrl = `${backUrl}?mp=success&ref=${purchase.id}`
  const pendingUrl = `${backUrl}?mp=pending&ref=${purchase.id}`
  const failureUrl = `${backUrl}?mp=failure&ref=${purchase.id}`

  const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      'X-Idempotency-Key': purchase.id,
    },
    body: JSON.stringify({
      items: [
        {
          id: club.slug,
          title: description,
          description,
          quantity: 1,
          currency_id: 'ARS',
          unit_price: totalAmount,
        },
      ],
      external_reference: purchase.id,
      notification_url: webhookUrl,
      back_urls: {
        success: backUrl,
        pending: backUrl,
        failure: backUrl,
      },
      statement_descriptor: 'LA TRIBUNA',
      // En sandbox forzamos que TODOS los pagos sean de prueba.
      // (El sandbox ya lo hace solo, pero por las dudas.)
      metadata: {
        purchase_id: purchase.id,
        club_slug: club.slug,
        cantidad,
      },
    }),
  })

  if (!mpRes.ok) {
    // Si MP falla, marcamos la purchase como rechazada para que no se quede
    // pendiente para siempre (el webhook no va a llegar nunca).
    await db.purchase.update({
      where: { id: purchase.id },
      data: { estado: 'rechazada', mpStatus: 'preference_failed' },
    })
    const txt = await mpRes.text()
    return NextResponse.json(
      { ok: false, error: 'Mercado Pago rechazó la preferencia', detail: txt.slice(0, 300) },
      { status: 502 }
    )
  }

  const pref = await mpRes.json()

  // 3. Guardar el mpPreferenceId para poder cruzarlo con el webhook.
  await db.purchase.update({
    where: { id: purchase.id },
    data: { mpPreferenceId: pref.id },
  })

  // 4. Devolver el init_point (URL de Checkout Pro). El front lo abre en otra
  //    pestaña. En sandbox el init_point es api.mercadopago.com/sandbox/...
  //    en prod es mercadopago.com/checkout/...
  return NextResponse.json({
    ok: true,
    purchaseId: purchase.id,
    preferenceId: pref.id,
    initPoint: pref.init_point,
    sandboxInitPoint: pref.sandbox_init_point,
  })
}
