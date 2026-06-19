# 🌐 Kaniz Global Trade — B2B Export/Import Marketplace

A production-ready, full-stack B2B export/import marketplace platform similar to Alibaba, IndiaMART, and TradeKey. Built with Next.js 15, TypeScript, Prisma/MySQL, Socket.IO, Redis, Meilisearch, and Stripe.

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Docker Deployment](#docker-deployment)
- [API Documentation](#api-documentation)
- [Socket.IO Events](#socketio-events)
- [User Roles](#user-roles)
- [Project Structure](#project-structure)
- [Security Notes](#security-notes)

---

## ✨ Features

### Public Website
- 🏠 Home page with hero, search, categories, featured products, verified suppliers
- 🔍 Advanced product & supplier search powered by Meilisearch
- 📦 Product listing & detail pages with inquiry form
- 🏢 Company profiles with verification badges
- 📝 RFQ (Request for Quotation) public board
- 📰 Blog / Trade news
- 📄 Pricing / membership plans page
- 📬 Contact form

### Supplier Dashboard
- 📊 Analytics overview (views, inquiries, RFQs, quotation rate)
- 🏢 Company profile management
- ✅ Document verification center
- 📦 Product management (add/edit/delete with approval workflow)
- 💬 Inquiry management & replies
- 📋 RFQ browser & quotation submission
- 💰 Quotation management
- 💬 Live real-time chat with buyers
- 👥 Staff management
- 💳 Subscription & invoice management
- 📈 Detailed analytics charts

### Buyer Dashboard
- 📋 RFQ creation & management
- 💬 Inquiry tracking
- 💰 Received quotations (accept/reject)
- 💬 Live chat with suppliers
- ❤️ Saved products & companies
- ⭐ Supplier reviews

### Admin Panel
- 📊 Real-time platform dashboard
- 👥 User management & role assignment
- 🏢 Company management & verification queue
- ✅ Product approval workflow
- 🏷️ Category management
- 💬 Inquiry & RFQ oversight
- 💳 Subscription & payment management
- 🔒 Audit logs
- 📰 Blog management
- 🎯 Banner/Ad management
- 🔍 SEO settings
- ⚙️ System settings

### Core Systems
- 🔐 JWT auth with refresh token rotation
- 📧 Email verification & password reset
- 🔒 2FA (TOTP) support
- 🏢 Multi-tenant company isolation
- 💬 Real-time Socket.IO chat (Redis adapter)
- 🔔 Real-time notifications
- 🔍 Full-text search (Meilisearch)
- 📁 File uploads (S3/R2 with image optimization)
- 💳 Stripe + PayPal + Manual bank transfer
- 📧 Email templates (SMTP/Mailgun/SendGrid)
- 📊 Company & product analytics
- 🛡️ RBAC permission system
- 🔄 BullMQ job queues
- 🐳 Docker + Nginx production setup

---

## 🛠 Tech Stack

| Layer        | Technology                                    |
|--------------|-----------------------------------------------|
| Frontend     | Next.js 15, React 19, TypeScript, Tailwind CSS |
| UI           | Shadcn/UI, Radix UI, Lucide Icons, Recharts    |
| State        | Zustand, TanStack Query                        |
| Forms        | React Hook Form + Zod                          |
| Backend      | Next.js API Routes, Node.js 20+               |
| ORM          | Prisma 5 + MySQL 8                             |
| Cache        | Redis 7 (ioredis)                              |
| Realtime     | Socket.IO 4 + Redis adapter                   |
| Search       | Meilisearch 1.x                                |
| Storage      | Cloudflare R2 / AWS S3 + Sharp                |
| Auth         | JWT + Argon2 + TOTP (2FA)                     |
| Payments     | Stripe + PayPal                                |
| Email        | Nodemailer (SMTP / Gmail OAuth)               |
| Queues       | BullMQ                                         |
| Deployment   | Docker + Docker Compose + Nginx               |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- MySQL 8+
- Redis 7+
- Meilisearch (optional for dev)

### 1. Clone & Install

```bash
git clone https://github.com/your-org/kaniz-global-trade.git
cd kaniz-global-trade
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed database with initial data
npm run db:seed
```

### 4. Start Development

```bash
# Start Next.js app
npm run dev

# In a separate terminal, start Socket.IO server
npm run socket:dev
```

Open [http://localhost:3000](http://localhost:3000)

### Default Credentials

| Role     | Email                              | Password        |
|----------|------------------------------------|-----------------|
| Admin    | admin@kanizglobaltrade.com         | Admin@123456    |
| Supplier | supplier@kanizglobaltrade.com      | Supplier@123456 |
| Buyer    | buyer@kanizglobaltrade.com         | Buyer@123456    |

---

## 🔧 Environment Variables

See [.env.example](.env.example) for all variables. Key ones:

```env
DATABASE_URL="mysql://user:pass@localhost:3306/kaniz_global_trade"
REDIS_URL="redis://localhost:6379"
JWT_ACCESS_SECRET="your-secret"
JWT_REFRESH_SECRET="your-refresh-secret"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
SOCKET_URL="http://localhost:3001"
S3_ACCESS_KEY="..."
S3_SECRET_KEY="..."
STRIPE_SECRET_KEY="sk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
MEILISEARCH_HOST="http://localhost:7700"
MEILISEARCH_API_KEY="masterKey"
SMTP_HOST="smtp.gmail.com"
SMTP_USER="..."
SMTP_PASS="..."
```

---

## 🗄️ Database Setup

### Run Migrations

```bash
# Development
npx prisma migrate dev --name init

# Production
npx prisma migrate deploy

# Reset (dev only — DESTROYS ALL DATA)
npx prisma migrate reset
```

### View Database (Prisma Studio)

```bash
npm run db:studio
# Opens at http://localhost:5555
```

### Re-seed

```bash
npm run db:seed
```

---

## 🐳 Docker Deployment

### Development

```bash
docker-compose up -d
```

### Production

```bash
# Build images
docker-compose -f docker-compose.yml build

# Start all services
docker-compose up -d

# Run migrations
docker-compose exec app npx prisma migrate deploy

# Seed
docker-compose exec app npm run db:seed

# View logs
docker-compose logs -f app
```

### Services

| Service     | Port  | Description              |
|-------------|-------|--------------------------|
| app         | 3000  | Next.js application      |
| socket      | 3001  | Socket.IO server         |
| mysql       | 3306  | MySQL 8 database         |
| redis       | 6379  | Redis cache & pub/sub    |
| meilisearch | 7700  | Full-text search         |
| nginx       | 80/443| Reverse proxy + SSL      |

---

## 📡 API Documentation

### Base URL: `/api`

All responses follow this format:

```json
{
  "success": true,
  "message": "Success",
  "data": {},
  "meta": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 }
}
```

### Authentication

```
POST /api/auth/register         Register new user
POST /api/auth/login            Login (returns JWT tokens)
POST /api/auth/refresh          Refresh access token
POST /api/auth/logout           Invalidate refresh token
POST /api/auth/verify-email     Verify email address
POST /api/auth/forgot-password  Request password reset
POST /api/auth/reset-password   Reset password with token
```

### Companies

```
GET    /api/companies                Get companies (public, paginated, filterable)
POST   /api/companies                Create company (requires SUPPLIER_OWNER role)
GET    /api/companies/:id            Get company by ID or slug
PUT    /api/companies/:id            Update company (requires company membership)
DELETE /api/companies/:id            Soft delete (admin only)
GET    /api/companies/:id/analytics  Get company analytics
```

### Products

```
GET    /api/products                 Get products (public: approved only)
POST   /api/products                 Create product (supplier)
GET    /api/products/:id             Get product by ID or slug
PUT    /api/products/:id             Update product (supplier)
DELETE /api/products/:id             Soft delete
POST   /api/products/:id/approve     Approve/reject product (admin)
POST   /api/products/:id/images      Add product images
POST   /api/products/:id/specifications Add specifications
```

### Inquiries

```
GET  /api/inquiries        Get inquiries (filtered by role)
POST /api/inquiries        Send inquiry (buyer)
GET  /api/inquiries/:id    Get inquiry
POST /api/inquiries/:id/reply  Reply to inquiry
PATCH /api/inquiries/:id/status  Update status
```

### RFQs

```
GET  /api/rfqs             Get RFQs (public: open, buyer: own)
POST /api/rfqs             Create RFQ (buyer)
GET  /api/rfqs/:id         Get RFQ details
PUT  /api/rfqs/:id         Update RFQ
```

### Quotations

```
GET  /api/quotations       Get quotations (role-filtered)
POST /api/quotations       Submit quotation (supplier)
GET  /api/quotations/:id   Get quotation
POST /api/quotations/:id/action  Accept/reject quotation (buyer)
```

### Chat

```
GET  /api/chat/rooms                      Get user's chat rooms
POST /api/chat/rooms                      Create chat room
GET  /api/chat/rooms/:roomId/messages     Get messages (paginated)
```

### Notifications

```
GET   /api/notifications    Get notifications (paginated)
PATCH /api/notifications    Mark all as read
PATCH /api/notifications/:id  Mark one as read
```

### Search

```
GET /api/search?q=query&index=products|companies&categoryId=...&countryId=...
    &isFeatured=true&verified=true&minPrice=10&maxPrice=100&sort=views:desc
```

### Admin APIs

```
GET   /api/admin/stats          Platform statistics
GET   /api/admin/users          All users (paginated)
PATCH /api/admin/users          Update user status/roles
GET   /api/admin/verification   Pending verifications
POST  /api/admin/verification   Approve/reject verification
GET   /api/admin/audit-logs     System audit logs
```

### Upload

```
POST /api/upload
  FormData fields:
    file: File
    type: product_image | product_video | product_doc | company_logo |
          company_banner | company_gallery | company_doc | certificate |
          chat_attachment | rfq_attachment | inquiry_attachment |
          blog_image | avatar | payment_proof
```

### Webhooks

```
POST /api/webhooks/stripe    Stripe payment events
```

---

## 🔌 Socket.IO Events

### Client → Server

| Event           | Payload                          | Description                     |
|-----------------|----------------------------------|---------------------------------|
| `chat:join`     | `{ roomId }`                     | Join a chat room                |
| `chat:leave`    | `{ roomId }`                     | Leave a chat room               |
| `message:send`  | `{ roomId, content, type }`      | Send a message                  |
| `message:read`  | `{ roomId, messageId }`          | Mark message as read            |
| `typing:start`  | `{ roomId }`                     | Start typing indicator          |
| `typing:stop`   | `{ roomId }`                     | Stop typing indicator           |

### Server → Client

| Event              | Payload                         | Description                  |
|--------------------|---------------------------------|------------------------------|
| `message:new`      | Message object                  | New message received         |
| `message:read`     | `{ messageId, userId }`         | Message read by user         |
| `typing:start`     | `{ userId, roomId }`            | User is typing               |
| `typing:stop`      | `{ userId, roomId }`            | User stopped typing          |
| `user:online`      | `{ userId }`                    | User came online             |
| `user:offline`     | `{ userId }`                    | User went offline            |
| `notification:new` | Notification object             | New notification             |

### Authentication

Connect with Bearer token:
```js
const socket = io('http://localhost:3001', {
  auth: { token: 'your-access-token' }
})
```

---

## 👥 User Roles

| Role             | Description                                    |
|------------------|------------------------------------------------|
| `SUPER_ADMIN`    | Full system access, can do anything            |
| `ADMIN`          | Platform management, approvals, moderation     |
| `MODERATOR`      | Content review, spam, reports, chat monitoring |
| `SUPPLIER_OWNER` | Own company management, full supplier features |
| `SUPPLIER_STAFF` | Assigned company features, limited access      |
| `BUYER`          | Search, RFQ, inquiries, chat, reviews          |
| `GUEST`          | Browse public data only                        |

---

## 📁 Project Structure

```
kaniz-global-trade/
├── app/                        # Next.js 15 App Router
│   ├── (public)/               # Public website pages
│   │   ├── page.tsx            # Homepage
│   │   ├── products/           # Product listing & detail
│   │   ├── companies/          # Company listing & detail
│   │   ├── rfqs/               # RFQ board
│   │   ├── auth/               # Login, register, etc.
│   │   └── layout.tsx          # Public layout with navbar
│   ├── dashboard/              # Supplier dashboard
│   │   ├── layout.tsx          # Sidebar navigation
│   │   ├── overview/           # Dashboard home
│   │   ├── products/           # Product management
│   │   ├── inquiries/          # Inquiry management
│   │   ├── rfqs/               # RFQ management
│   │   ├── quotations/         # Quotation management
│   │   ├── chat/               # Live chat
│   │   ├── analytics/          # Analytics charts
│   │   └── subscription/       # Subscription management
│   ├── buyer/                  # Buyer dashboard
│   │   ├── layout.tsx          # Buyer sidebar
│   │   ├── rfqs/               # Buyer RFQs
│   │   ├── quotations/         # Received quotations
│   │   └── chat/               # Buyer chat
│   ├── admin/                  # Admin panel
│   │   ├── layout.tsx          # Admin sidebar
│   │   ├── dashboard/          # Admin overview
│   │   ├── products/           # Product approval
│   │   ├── verification/       # Company verification
│   │   └── users/              # User management
│   └── api/                    # API routes
│       ├── auth/               # Auth endpoints
│       ├── companies/          # Company CRUD
│       ├── products/           # Product CRUD + approval
│       ├── inquiries/          # Inquiry system
│       ├── rfqs/               # RFQ system
│       ├── quotations/         # Quotation system
│       ├── chat/               # Chat rooms & messages
│       ├── notifications/      # Notification management
│       ├── subscriptions/      # Subscription management
│       ├── payments/           # Payment processing
│       ├── upload/             # File upload
│       ├── search/             # Meilisearch proxy
│       ├── admin/              # Admin APIs
│       └── webhooks/           # Stripe webhooks
├── components/
│   ├── ui/                     # Shadcn UI base components
│   ├── public/                 # Public page components
│   │   ├── home/               # Homepage sections
│   │   ├── products/           # Product components
│   │   ├── companies/          # Company components
│   │   └── layout/             # Navbar, footer
│   ├── dashboard/              # Dashboard components
│   │   ├── supplier/           # Supplier-specific
│   │   ├── buyer/              # Buyer-specific
│   │   └── shared/             # Shared dashboard UI
│   └── admin/                  # Admin panel components
├── lib/
│   ├── auth/                   # JWT, password, session
│   ├── db/                     # Prisma client, Redis client
│   ├── email/                  # Email templates & sender
│   ├── payment/                # Stripe, PayPal clients
│   ├── permissions/            # RBAC & auth middleware
│   ├── search/                 # Meilisearch client
│   ├── storage/                # S3/R2 upload utilities
│   └── utils/                  # API helpers, audit log
├── server/
│   ├── socket/                 # Socket.IO server setup
│   ├── queues/                 # BullMQ queue workers
│   └── services/               # Business logic services
├── store/                      # Zustand global state
├── types/                      # TypeScript type definitions
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── seed.ts                 # Database seeder
├── docker/
│   ├── nginx/nginx.conf        # Nginx reverse proxy config
│   └── mysql/init.sql          # MySQL initialization
├── docker-compose.yml          # Development & production setup
├── Dockerfile                  # Next.js production image
└── .env.example                # Environment template
```

---

## 🔐 Security Notes

1. **Passwords** — Hashed with Argon2id (memory-hard, 64MB, 3 iterations)
2. **JWT** — Short-lived access tokens (15m), rotating refresh tokens (7d)
3. **Multi-tenant isolation** — Every supplier query scoped to `companyId`
4. **Rate limiting** — Redis sliding window on all auth and API endpoints
5. **File uploads** — MIME type validation, size limits, malware-safe rules, private docs via signed URLs
6. **SQL injection** — Prevented by Prisma parameterized queries
7. **XSS** — Next.js built-in HTML escaping; no `dangerouslySetInnerHTML`
8. **CORS** — Configured for production domain only
9. **Audit logs** — Every admin action, login, and data change is logged
10. **2FA** — TOTP (Google Authenticator compatible) for admin accounts
11. **Stripe webhooks** — Verified with `stripe-signature` header

### Production Checklist

- [ ] Change all default passwords
- [ ] Set strong `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (32+ chars)
- [ ] Enable HTTPS with valid SSL certificate
- [ ] Set `NODE_ENV=production`
- [ ] Configure proper CORS origins
- [ ] Enable Nginx rate limiting
- [ ] Set up database backups
- [ ] Configure CDN for uploaded files
- [ ] Set Stripe to live mode
- [ ] Enable Redis persistence (`appendonly yes`)
- [ ] Monitor with PM2 or similar process manager

---

## 📧 Support

- Email: support@kanizglobaltrade.com
- Documentation: https://docs.kanizglobaltrade.com

---

## 📜 License

Copyright © 2024 Kaniz Global Trade. All rights reserved.
