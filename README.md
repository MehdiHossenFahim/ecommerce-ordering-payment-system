# E-commerce Ordering & Payment System

Backend: Node.js + Express + Passport (Local + JWT) + PostgreSQL (Prisma ORM) + Redis
Frontend: React (Vite) — minimal storefront

## 1. Architecture Overview

```
                        ┌─────────────┐
                        │   React     │
                        │  Frontend   │
                        └──────┬──────┘
                               │ REST (JWT Bearer)
                        ┌──────▼──────┐
                        │   Express   │
                        │   API       │
                        │ (Passport)  │
                        └──┬───────┬──┘
                 ┌─────────┘       └─────────┐
          ┌──────▼──────┐            ┌───────▼──────┐
          │ PostgreSQL  │            │    Redis     │
          │  (Prisma)   │            │ (cache/token)│
          └─────────────┘            └──────────────┘
                               │
                 ┌─────────────┴─────────────┐
           ┌─────▼─────┐               ┌──────▼─────┐
           │  Stripe   │               │   bKash    │
           │  Strategy │               │  Strategy  │
           └───────────┘               └────────────┘
```

**Design decisions mapped to requirements:**

- **OOP**: `src/models/{User,Product,Order}.js` encapsulate domain behavior (password hashing, JWT issuance, stock rules, total calculation) separately from persistence (Prisma) and HTTP (controllers).
- **Data structures**: relational tables with indexes on `email`, `sku`, `status`, `categoryId`, `userId`, `orderId`, `transactionId` (see `prisma/schema.prisma`). Categories are a self-referencing adjacency list (parent/child) representing a hierarchy.
- **Deterministic algorithms**: `Order.calculateTotals()` (pure function, no side effects) and `productService.reduceStock()` (conditional `updateMany` guarded by `stock >= quantity`, so concurrent checkouts can never oversell).
- **Strategy pattern**: `src/payments/PaymentStrategy.js` is the abstract interface; `StripeStrategy` and `BkashStrategy` implement it; `PaymentContext` is the context object order/checkout code depends on. Adding a new provider = one new class + one line in `PaymentContext`'s registry, zero changes to order logic.
- **DFS + caching**: `src/utils/dfs.js` builds the category tree from flat rows, caches it in Redis (10 min TTL, invalidated on category/product category changes), and does an iterative DFS from a given category to collect the whole subtree for "related products" recommendations.

## 2. Project Structure

```
backend/
  prisma/schema.prisma      # DB schema (Users, Products, Categories, Orders, OrderItems, Payments)
  prisma/seed.js            # Seeds admin user + sample categories/products
  src/
    config/                 # prisma client, redis client, passport strategies
    middleware/              # JWT auth, admin guard, validation, error handler
    models/                  # OOP domain classes (User, Product, Order)
    payments/                 # Strategy pattern (PaymentStrategy, StripeStrategy, BkashStrategy, PaymentContext)
    services/                 # business logic (user, product, order, payment, category)
    controllers/              # HTTP request handlers
    routes/                   # Express routers
    utils/                    # logger, dfs.js (category tree + caching)
    app.js / server.js
  tests/                     # Jest + Supertest (auth + order flows)
  Dockerfile
frontend/
  src/
    pages/                   # Login, Register, Products, Cart, Checkout, Orders
    components/               # Navbar, ProductCard
    context/                  # AuthContext, CartContext
    api.js                    # axios client with JWT interceptor
docker-compose.yml            # postgres + redis + backend
```

## 3. Setup

### Option A — Docker (recommended)

```bash
cd backend
cp .env.example .env          # edit JWT_SECRET, Stripe/bKash keys as needed
cd ..
docker compose up --build     # starts postgres, redis, backend on :4000
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run seed
```

### Option B — Local

```bash
# 1. Backend
cd backend
cp .env.example .env          # point DATABASE_URL/REDIS_URL at local instances
npm install
npx prisma migrate dev --name init
npm run seed                  # creates admin@example.com / Admin@12345 + sample products
npm run dev                   # http://localhost:4000

# 2. Frontend (separate terminal)
cd frontend
cp .env.example .env          # VITE_API_URL=http://localhost:4000/api
npm install
npm run dev                   # http://localhost:5173
```

You'll need a local PostgreSQL and Redis instance running (or use `docker compose up postgres redis` and point `.env` at `localhost`).

### Running tests

```bash
cd backend
npm test
```

### Exposing the backend for provider webhooks (per deliverable: "Backend running locally via ngrok")

```bash
ngrok http 4000
# then set BKASH_CALLBACK_URL and your Stripe webhook endpoint to the ngrok HTTPS URL
```

## 4. API Reference (summary)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Register a user |
| POST | `/api/auth/login` | — | Login, returns JWT |
| GET | `/api/auth/me` | JWT | Current user |
| GET | `/api/auth/orders` | JWT | Current user's orders |
| GET | `/api/products` | — | List products (paginated) |
| GET | `/api/products/:id` | — | Product detail |
| GET | `/api/products/:id/related` | — | DFS category-based recommendations |
| POST | `/api/products` | JWT+Admin | Create product |
| PUT | `/api/products/:id` | JWT+Admin | Update product |
| DELETE | `/api/products/:id` | JWT+Admin | Delete product |
| GET | `/api/categories` | — | Full category tree (Redis-cached) |
| POST | `/api/categories` | JWT+Admin | Create category |
| POST | `/api/orders` | JWT | Create order from cart items |
| GET | `/api/orders/:id` | JWT | Order detail |
| POST | `/api/payments/checkout` | JWT | Initiate payment (`{orderId, provider}`) |
| POST | `/api/payments/:transactionId/confirm` | JWT | Confirm/execute payment |
| GET | `/api/payments/:transactionId` | JWT | Query payment status |
| POST | `/api/payments/stripe/webhook` | Stripe signature | Stripe webhook |
| GET/POST | `/api/payments/bkash/callback` | — | bKash redirect callback |

Full Postman-style flow: register → browse `/api/products` → `POST /api/orders` → `POST /api/payments/checkout` with `provider: "stripe"` or `"bkash"` → for Stripe, confirm client-side with Stripe.js then rely on the webhook; for bKash, the user is redirected to `redirectUrl` and lands back on `/api/payments/bkash/callback`.

## 5. Order Flow (implemented)

1. User adds products to cart (frontend state) → `POST /api/orders` creates an order in `pending` status (stock is validated but **not yet decremented**).
2. User picks Stripe or bKash → `POST /api/payments/checkout` calls `PaymentContext.initiate()`, creates a `Payment` row (`status: pending`), and returns provider-specific data (Stripe `clientSecret` or bKash `redirectUrl`).
3. Provider confirms asynchronously (Stripe webhook / bKash callback) or via explicit `confirm`/`query` calls.
4. On success, `paymentService.applyPaymentResult()` marks the payment `success`, then `orderService.markOrderPaid()` — inside a DB transaction — decrements stock for every line item and flips the order to `paid`. On failure, the order is marked `canceled`.

## 6. Notes / Production Considerations

- Rotate `JWT_SECRET`/`SESSION_SECRET` and never commit real Stripe/bKash keys.
- Stripe webhook uses raw-body signature verification — mounted before `express.json()` in `app.js`.
- bKash's `id_token` is cached in Redis (~55 min TTL) to avoid re-authenticating on every call.
- This is a scoped assessment build: for production you'd add refresh tokens, rate limiting, request idempotency keys on payment endpoints, and structured OpenAPI/Swagger docs generation.
