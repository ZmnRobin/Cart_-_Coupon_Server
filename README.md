# E-Commerce Cart & Coupon Service

A robust, production-grade backend API service for managing shopping carts and applying complex coupon logic. Built with TypeScript, Express, Prisma, and SQLite.

## Features

- **Cart Management**: Add, update, remove items.
- **Advanced Coupon System**:
  - Support for Fixed (`$10 off`) and Percentage (`10% off`) discounts.
  - Validation rules: Expiry dates, minimum cart total, minimum item count, product restrictions.
  - **Auto-Apply Coupons**: Intelligent logic to automatically find and apply the *best* available coupon.
  - **Concurrency Control**: Prevents coupon overuse using Optimistic Concurrency Control (OCC) with versioning.
- **Precision Math**: All monetary calculations are performed in cents (integers) to avoid floating-point errors.
- **Architecture**: Clean, layered architecture (`Routes` -> `Controllers` -> `Services` -> `Prisma`).

## Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Express.js
- **Database / ORM**: SQLite / Prisma
- **Testing**: Manual testing via Postman

## Prerequisites

- Node.js (v14 or higher recommended)
- npm

## Installation & Setup

1.  **Clone the repository** (if applicable) or unzip the project.
2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Database Setup**:
    Initialize the SQLite database and generate the Prisma Client:
    ```bash
    npx prisma db push
    npx prisma generate
    ```

4.  **Seed Data**:
    Populate the database with sample products and coupons (Required for testing):
    ```bash
    npx ts-node prisma/seed.ts
    ```
    *Note the output of this command. It will create a product with ID `1` (usually) and coupons `SAVE10` and `OFF10`.*

## Running the Application

Start the development server:
```bash
npm run dev
```
The server will start at `http://localhost:3000`.

## Testing the API

You can test the API using any of the following three methods:

### Option 1: Postman Collection (API Testing)

A Postman collection is included in the project for easy API testing.

**Location:** `src/postman/Cart Service API.postman_collection.json`

**Steps:**
1. Open Postman
2. Click **Import** and select the collection file from `src/postman/`
3. The collection "Cart Service API" will appear with all endpoints
4. Use `user123` as the test `userId`

**Available Endpoints:**
- **GET /cart/:userId** - View cart & totals
- **POST /cart/:userId/item** - Add item to cart
- **PUT /cart/:userId/item/:productId** - Update item quantity
- **DELETE /cart/:userId/item/:productId** - Remove item
- **POST /cart/:userId/coupon/apply** - Apply coupon
- **POST /cart/:userId/coupon/remove** - Remove coupon
- **GET /products** - Get all products

### Option 2: Unit Tests (Automated Testing)

Run the automated test suite to verify all functionality:

```bash
npm test
```

This will run Jest tests covering:
- Cart operations (add, update, remove items)
- Coupon validation and application
- Concurrency control
- Auto-coupon selection

### Option 3: React Frontend (Visual Testing)

A React frontend is available for visual testing and demonstration.

**Local Development:**
```
Frontend URL: http://localhost:5173
Backend URL: http://localhost:5000
```

**Steps:**
1. Ensure the backend server is running (`npm run dev`)
2. Navigate to the frontend directory and start it
3. Open `http://localhost:5173` in your browser
4. Interact with the cart and test coupon functionality visually

**Production (Vercel):**
- Frontend: *[To be deployed]*
- Backend: Ensure CORS is configured for the Vercel domain

## Project Structure

```
src/
├── config/           # Constants & Prisma instance
├── controllers/      # Request handlers
├── services/         # Business logic (Cart calculations, Coupon validation)
├── routes/           # API Route definitions
├── types/            # TypeScript interfaces
└── index.ts          # App entry point
prisma/
├── schema.prisma     # Database schema
└── seed.ts           # Data seeding script
```

## Key Configuration
- **Database**: SQLite file stored locally as `prisma/dev.db`.
- **Money**: All prices are stored and calculated as Cents (Int).

## Troubleshooting
- **Import Errors?**: Run `npx prisma generate`.
- **"Foreign key constraint violated"?**: Ensure you ran `npx ts-node prisma/seed.ts` and are using a valid `productId` (check the seed output).
# cart-coupon-server
