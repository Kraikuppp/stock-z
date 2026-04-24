# Stock-Z Inventory Management System

A simple but scalable inventory management system with barcode support.

## Architecture

```
┌─────────────┐    Supabase JS     ┌─────────────┐
│   React     │ ←──────────────→  │   Supabase  │
│  Frontend   │                   │  PostgreSQL │
└─────────────┘                   └─────────────┘
```

No backend server needed — React talks directly to Supabase via the JS client.

## Tech Stack

- **Frontend**: React 18 + Vite + TailwindCSS + React Router
- **Database**: Supabase (PostgreSQL + REST API + Auth)

## Core Philosophy: Event Sourcing for Stock

**DO NOT store stock as a single number** ❌  
**DO store every stock movement** ✅

Stock is calculated dynamically: `SUM(IN) - SUM(OUT)`

This gives you:
- Complete audit trail
- No data corruption
- Easy debugging
- Historical analysis

## Project Structure

```
stock-z/
├── frontend/                # React SPA
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   │   ├── BarcodeInput.jsx
│   │   │   ├── Layout.jsx
│   │   │   └── Toast.jsx
│   │   ├── pages/          # Main pages
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Receive.jsx
│   │   │   ├── Sell.jsx
│   │   │   ├── Products.jsx
│   │   │   └── Movements.jsx
│   │   ├── services/
│   │   │   ├── supabase.js  # Supabase client init
│   │   │   └── api.js       # Data access layer
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── tailwind.config.js
├── database/
│   └── schema.sql          # Database schema (run in Supabase SQL Editor)
└── README.md
```

## Database Schema

### Tables

**products**
- `id` (PK)
- `sku` (unique) - barcode number
- `name`
- `category`
- `created_at`

**stock_movements** (The key table!)
- `id` (PK)
- `product_id` (FK)
- `type` - 'IN' or 'OUT'
- `quantity` - always positive
- `created_at`

## Setup Instructions

### 1. Database Setup (Supabase)

1. Go to [supabase.com](https://supabase.com) and create a project
2. Open the **SQL Editor** in your Supabase dashboard
3. Copy and run the SQL from `database/schema.sql`
4. Go to **Settings → API** to get your project URL and anon key

### 2. Frontend Setup

```bash
cd frontend
npm install

# Create .env with your Supabase credentials
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-key

npm run dev
```

## Supabase Tables & Operations

All data access goes through `@supabase/supabase-js` directly — no backend API needed.

| Operation | Supabase Call |
|-----------|--------------|
| List products + stock | `from('products').select('*, stock_movements(type, quantity)')` |
| Find by SKU | `from('products').select(...).eq('sku', sku).single()` |
| Create product | `from('products').insert({...})` |
| Receive stock (IN) | `from('stock_movements').insert({type:'IN', ...})` |
| Sell stock (OUT) | `from('stock_movements').insert({type:'OUT', ...})` |
| View movements | `from('stock_movements').select('*, products(sku, name)')` |

## Features

### Pages

1. **Dashboard**: Stock overview with low-stock alerts
2. **Receive**: Scan barcode → Input quantity → Stock IN
3. **Sell**: Scan barcode → Auto -1 or manual quantity → Stock OUT
4. **Products**: Manage product catalog
5. **Movements**: View all transactions with filters

### Barcode Input

Barcode scanners act like keyboards:
- Input is filled rapidly
- Usually ends with Enter key
- Component automatically detects scanner vs manual typing

## Key Features

- ✅ Stock calculated from movements (event sourcing)
- ✅ Prevents negative stock
- ✅ Auto-creates products on receive if not found
- ✅ Real-time stock validation
- ✅ Responsive design
- ✅ Toast notifications

## Production Deployment

```bash
cd frontend
npm run build
# Deploy `dist/` folder to Netlify, Vercel, or any static host
```

## Environment Variables

### Frontend (.env)
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## License

MIT
