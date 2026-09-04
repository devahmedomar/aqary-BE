# Aqary — Beni Suef Real Estate Platform (Backend)

Express.js + TypeScript + PostgreSQL backend for the single-broker real estate
platform. See `../SRS_منصة_عقارات_بني_سويف (1).md` for requirements and
`../backend_tasks.md` for the original task breakdown.

## Stack

- **Runtime:** Node.js >= 18, TypeScript (strict)
- **Web framework:** Express 5
- **Database:** PostgreSQL, accessed with raw `pg` connection pool + typed query helpers (no ORM)
- **Validation:** zod
- **Auth:** JWT (`jsonwebtoken`) + bcrypt password hashing
- **Other:** CORS, morgan (logging), express-rate-limit (rate limiting), swagger-jsdoc + swagger-ui-express (OpenAPI docs)
- **Tooling:** ESLint + Prettier, Jest + ts-jest + supertest (test scaffolding)

## Project structure

```
backend/
  db/
    schema.sql          # Database schema + seed data (source of truth)
    apply-schema.ts     # Applies schema.sql (npm run db:schema)
    seed-check.ts       # Verifies regions/property_types are seeded
    setup-owner.ts      # Creates the first owner admin account
  src/
    config/             # env validation, db pool, swagger spec
    middleware/         # authGuard, requireRole, validate, errorHandler, cors, logging, rate limit
    modules/
      auth/             # login, JWT, admin-users, /me
      regions/          # public list + owner add (cached)
      property-types/   # public list + owner add (cached)
      listings/         # core entity: admin CRUD + public filtered search
      images/           # listing image URLs (no binary storage)
      inquiries/        # "request a viewing" public form + admin list
      stats/            # admin dashboard aggregates
    types/              # domain model types + Express augmentation
    utils/              # db helpers, asyncHandler, response envelope, AppError
    app.ts              # express app + route mounting
    server.ts           # bootstrap + graceful shutdown
  tests/                # jest tests (scaffolding present, specs to add)
  Dockerfile
  docker-compose.yml
```

## Quick start

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# edit .env — set DATABASE_URL, JWT_SECRET for your environment
```

### 3. Start a database

With Docker (auto-applies `db/schema.sql` on first boot):

```bash
docker compose up -d
```

Or point `DATABASE_URL` at an existing PostgreSQL instance and apply the schema:

```bash
npm run db:schema        # applies db/schema.sql
npm run db:verify        # confirms regions & property_types are seeded
```

### 4. Create the first admin (owner) account

The owner cannot be created through the public API:

```bash
OWNER_USERNAME=admin OWNER_PASSWORD='a-strong-password' OWNER_NAME='Broker Name' npm run db:setup-owner
```

Or via `node -r ts-node/register db/setup-owner.ts`.

### 5. Run the server

```bash
npm run dev     # ts-node-dev, watch mode
# or
npm run build && npm start
```

Health check: `GET http://localhost:4000/api/health` → `{ "status": "ok" }`
API docs (Swagger UI): `http://localhost:4000/api/docs`
OpenAPI JSON: `http://localhost:4000/api/docs.json`

## Scripts

| Command              | Description                                  |
| -------------------- | -------------------------------------------- |
| `npm run dev`        | Run server in watch mode                     |
| `npm run build`      | Compile TypeScript to `dist/`                |
| `npm run start`      | Run compiled output                          |
| `npm run typecheck`  | `tsc --noEmit`                               |
| `npm run lint`       | ESLint over `src/**/*.ts`                    |
| `npm run format`     | Prettier format                              |
| `npm test`           | Jest                                         |
| `npm run db:schema`  | Apply `db/schema.sql`                        |
| `npm run db:verify`  | Verify seeded lookup tables                  |
| `npm run db:setup-owner` | Create first admin (reads OWNER_* env)  |

## API overview

All responses use `{ data, meta }` for success and `{ error: { message, code } }`
for failures. Admin routes require `Authorization: Bearer <token>`.

| Method | Path                     | Auth   | Description                                  |
| ------ | ------------------------ | ------ | -------------------------------------------- |
| GET    | `/api/health`            | –      | Health check                                 |
| GET    | `/api/docs` / `...json`  | –      | Swagger UI / OpenAPI spec                    |
| POST   | `/api/auth/login`        | –      | Admin login → JWT                            |
| GET    | `/api/auth/me`           | token  | Current admin profile                        |
| POST   | `/api/auth/admin-users`  | owner  | Create staff account                         |
| GET    | `/api/regions`           | –      | List regions                                 |
| POST   | `/api/regions`           | owner  | Add region                                   |
| GET    | `/api/property-types`    | –      | List property types                          |
| POST   | `/api/property-types`    | owner  | Add property type                            |
| GET    | `/api/listings`          | –      | Active listings, filters + pagination        |
| GET    | `/api/listings/featured` | –      | Featured active listings                     |
| GET    | `/api/listings/:id`      | –      | Listing detail (increments views)            |
| GET    | `/api/admin/listings`    | token  | All listings incl. drafts/archived           |
| POST   | `/api/admin/listings`    | token  | Create listing (default status `draft`)      |
| PATCH  | `/api/admin/listings/:id`| token  | Partial update (creator or owner)            |
| PATCH  | `/api/admin/listings/:id/status` | token | One-click status change               |
| DELETE | `/api/admin/listings/:id`| token  | Soft delete (sets status `archived`)         |
| POST   | `/api/admin/listings/:id/images` | token | Add image URL (max 15)               |
| PATCH  | `/api/admin/listings/:id/images/reorder` | token | Reorder images                |
| PATCH  | `/api/admin/listings/:id/images/:imageId/primary` | token | Set primary       |
| DELETE | `/api/admin/listings/:id/images/:imageId` | token | Remove image row              |
| POST   | `/api/inquiries`         | –      | Visitor "request a viewing" (rate-limited)   |
| GET    | `/api/admin/inquiries`   | token  | List inquiries (filter by listing_id)        |
| GET    | `/api/admin/stats/overview` | token | Dashboard counts                        |
| GET    | `/api/admin/stats/top-listings` | token | Top 5 by views                    |
| GET    | `/api/admin/stats/listings/:id/views` | token | Views + inquiries count         |

### Public listings filter query params

`operation_type` (`sale`/`rent`), `property_type_id`, `region_id`,
`min_price`, `max_price`, `min_area`, `max_area`, `rooms`, `q` (free text on
title/description), `sort` (`newest`/`price_asc`/`price_desc`), `page`, `limit`.

## Enums (from schema.sql)

- `operation_type`: `sale`, `rent`
- `listing_status`: `active`, `sold`, `rented`, `reserved`, `archived`
- `finishing_level`: `unfinished`, `shell`, `semi`, `full`, `luxury`
- `admin_role`: `owner`, `staff`

## Notes & known decisions

- **Images are URL-only.** The backend never receives binary files; it accepts
  and validates `https://` URLs and stores them. There is intentionally no
  `multer`/S3/storage integration. Refer to `backend_tasks.md` Phase 6 for the
  flagged risk that external hosts may delete unclaimed images (recommend a
  background HEAD-check job in a future phase).
- **Listings default to `draft`** on creation and only appear publicly once
  their status is set to `active`.
- **Deletes are soft** (status → `archived`) to preserve history.
- **Rate limits:** strict limiter (20 req / 15 min per IP) on
  `POST /api/auth/login` and `POST /api/inquiries`; general `300 / 15 min` on
  all `/api` routes. Adjust in `src/middleware/rateLimit.ts`.
- **CORS:** in production, only `FRONTEND_ORIGIN` is allowed; open in dev.

## What's left (see `backend_tasks.md`)

- Phase 2.6: rate limiting is implemented; verify heading toward production.
- Phase 9.1: input sanitization for stored XSS defense — not yet applied.
- Phase 9.5: Jest + supertest specs — scaffolding only, write the actual tests.
- Phase 6.7: background job to HEAD-check stored `image_url`s (dead-link flagging).
- Phase 7.4: optional broker notification on new inquiry.
- Phase 10.3: choose a migration tool if you want versioned migrations instead of plain schema.sql.
- No CI pipeline yet.
