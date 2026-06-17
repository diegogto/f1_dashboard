# F1 Scale Models Dashboard

Aplicación web para monitorear precios de autos de Fórmula 1 a escala 1:43 de [CK-ModelCars](https://ck-modelcars.de).

## Stack

- **Frontend**: Next.js 16 (App Router) + TanStack Table v8 + Shadcn/ui + Tailwind CSS
- **Backend**: Next.js API Routes + node-cron
- **Base de datos**: PostgreSQL + Prisma ORM v7
- **Scraper**: Python 3 (requests + lxml + psycopg2)
- **Despliegue**: Docker (multi-stage) + Dokploy

## Inicio Rápido (Desarrollo Local)

### 1. Pre-requisitos

```bash
node >= 20
python3 >= 3.10
docker + docker-compose
```

### 2. Variables de entorno

```bash
cp .env.example .env
# Edita DATABASE_URL si usas PostgreSQL local sin Docker
```

### 3. Con Docker Compose (recomendado)

```bash
docker compose up --build
```

La app estará en http://localhost:3000 y PostgreSQL en el puerto 5432.

### 4. Sin Docker

```bash
# Instalar dependencias Node
npm install

# Generar cliente Prisma
npx prisma generate

# Aplicar migraciones (requiere PostgreSQL corriendo)
npx prisma migrate dev --name init

# Instalar dependencias Python
pip3 install -r scraper/requirements.txt

# Cargar datos iniciales desde Google Sheets
DATABASE_URL="postgresql://..." python3 scraper/seed_from_sheets.py

# Iniciar servidor de desarrollo
npm run dev
```

## Seed: Cargar Datos Históricos

El script `scraper/seed_from_sheets.py` lee las hojas del Google Sheet original y carga en PostgreSQL:

- **Todos_ck** → Tabla `Model` (632 modelos)
- **Canasta** → Tabla `PriceHistory` (historial de precios con fechas)
- **Wishlist** → Marca `isWishlisted = true` en los modelos correspondientes
- **Blacklist** → Marca `isBlacklisted = true`

```bash
# Copia las credenciales del bot de Google
cp /ruta/a/formula1-collection-89688a4d1ad3.json scraper/google_creds.json

# Ejecutar seed
DATABASE_URL="postgresql://f1user:f1pass@localhost:5432/f1db" \
GOOGLE_CREDS_FILE="./scraper/google_creds.json" \
python3 scraper/seed_from_sheets.py
```

## Scraper Automático

El scraper corre automáticamente cada día a las **04:00 AM (Europe/Berlin)** vía `node-cron`.

Para ejecutarlo manualmente:

```bash
# Desde la terminal
DATABASE_URL="..." python3 scraper/scraper.py

# Via API (con secret)
curl -X POST http://localhost:3000/api/cron \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Despliegue en Dokploy

1. Crea un nuevo servicio tipo **Docker Build** en Dokploy.
2. Apunta al repositorio con el `Dockerfile` en la raíz.
3. Configura las variables de entorno:
   - `DATABASE_URL` → Connection string de tu PostgreSQL en Dokploy
   - `CRON_SECRET` → Secret para el endpoint de trigger manual
   - `NEXT_PUBLIC_APP_URL` → URL pública de la app
4. El contenedor ejecuta migraciones automáticamente al iniciar (`docker-entrypoint.sh`).

## Estructura del Proyecto

```
f1_dashboard/
├── prisma/
│   ├── schema.prisma          # Esquema: Model, PriceHistory, ScraperRun
│   └── migrations/            # Migraciones SQL generadas
├── prisma.config.ts           # Config Prisma v7
├── scraper/
│   ├── scraper.py             # Scraper mejorado (paralelo, con retry)
│   ├── seed_from_sheets.py    # Migración inicial desde Google Sheets
│   └── requirements.txt       # Deps Python
├── src/
│   ├── app/
│   │   ├── page.tsx           # Dashboard principal (server component)
│   │   ├── layout.tsx
│   │   └── api/
│   │       ├── models/        # GET /api/models
│   │       ├── filters/       # GET /api/filters
│   │       └── cron/          # POST /api/cron (trigger manual)
│   ├── components/
│   │   ├── models-table.tsx   # TanStack Table principal
│   │   ├── price-badge.tsx    # Celda ▲▼ con días transcurridos
│   │   ├── table-filters.tsx  # Filtros facetados
│   │   └── ui/                # Shadcn/ui components
│   ├── lib/
│   │   ├── db.ts              # Singleton PrismaClient
│   │   ├── cron.ts            # node-cron config
│   │   └── utils.ts           # cn, formatPrice, daysSince
│   └── types/
│       └── model.ts           # TypeScript types
├── Dockerfile                 # Multi-stage: Node + Python
├── docker-compose.yml         # Dev: app + PostgreSQL
├── docker-entrypoint.sh       # Migraciones al iniciar
└── .env.example
```
