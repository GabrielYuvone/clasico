# La Tribuna

Estadio virtual de 100.000 ubicaciones. Los visitantes eligen su club, pagan con Mercado Pago (o usan el botón "Soy amigo" para no pagar), y los hinchas se pintan en una cancha isométrica vista desde arriba. Inspirado en [lapopular.online](https://lapopular.online).

## Cómo funciona

1. El visitante entra y ve un estadio en canvas con sus tres bandejas, vomitorios y la cancha pintada con franjas.
2. Clic en **"¡Meto hinchas!"** → modal con:
   - Selección de club (46 clubes argentinos precargados)
   - Cantidad de hinchas (1, 5, 10, 50, 100, 500, 1000, o personalizada hasta 2.000)
   - Nombre y mensaje opcional
   - **Pagar con Mercado Pago** — flujo automático: abre Checkout Pro, MP le pega al webhook, los hinchas pintan solos cuando el pago se aprueba. Nadie confirma nada a mano.
   - **🤝 Soy amigo** — mete los hinchas sin pagar (para pruebas o amigos del admin).
3. La cancha, el Top 3, el ranking, el feed de actividad y la barra de aforo se actualizan en vivo (polling cada 4 s).

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind 4
- **Prisma + SQLite** para `Club` y `Purchase`
- **Canvas isométrico** en TypeScript puro (`src/lib/stadium/estadio.ts`)
- **Mercado Pago Checkout Pro** + webhook HMAC SHA256

## Setup

```bash
# Instalar dependencias
bun install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de MP

# Crear la DB y seedear los clubes
bun run db:push
bun run scripts/seed.ts

# Levantar el dev server
bun run dev
```

Abrí http://localhost:3000 (o tu URL pública).

## Configuración de Mercado Pago

1. Crear app en https://www.mercadopago.com.ar/developers/panel
2. Habilitar **Checkout Pro** y **Webhooks**
3. Copiar `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`, `MP_CLIENT_ID`, `MP_CLIENT_SECRET` al `.env`
4. En **Notificaciones → Webhooks**:
   - URL: `https://<tu-dominio>/api/mp/webhook`
   - Evento: `Pagos (legacy)`
5. Copiar la **Clave secreta** del webhook al `.env` como `MP_WEBHOOK_SECRET`

## Aprobar pagos manualmente (solo dev / debug)

```bash
bun run scripts/approve.ts --list          # ver pendientes
bun run scripts/approve.ts <op>            # aprobar por número de operación
bun run scripts/approve.ts --all           # aprobar todas
bun run scripts/approve.ts --reject <id>   # rechazar una
```

> Nota: con la integración automática de MP vía webhook, esto **no hace falta** — los pagos se aprueban solos. Este script queda solo para debugging.

## Estructura

```
prisma/schema.prisma           Modelos Club y Purchase
scripts/seed.ts                Seed de 46 clubes argentinos
scripts/approve.ts             Aprobación manual de compras
src/app/api/
  clubs/route.ts               GET /api/clubs        (lista con hinchas)
  feed/route.ts                GET /api/feed         (últimas compras)
  buy/route.ts                 POST /api/buy         (amigo / legacy)
  config/route.ts              GET /api/config       (estado del estadio)
  mp/preference/route.ts       POST /api/mp/preference (crea preferencia MP)
  mp/webhook/route.ts          POST /api/mp/webhook  (recibe aviso de MP, verifica firma HMAC)
src/lib/stadium/estadio.ts     Renderer del estadio en canvas isométrico
src/components/
  Stadium.tsx                  Canvas wrapper
  BuyForm.tsx                  Modal de compra (2 botones: Pagar / Soy amigo)
src/app/page.tsx               Página principal (Top 3, ranking, aforo, feed)
```

## Modo "Soy amigo"

Para evitar que cualquier persona entre sin pagar, en `/api/config` cambiá `permiteAmigo: false`. El botón "Soy amigo" se oculta.

## Licencia

Privado — Proyecto de demostración.
