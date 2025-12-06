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

### Method 1: Postman (Recommended)

A `postman_collection.json` file is included in the project root (or provided separately). 

1.  Open Postman.
2.  Import `postman_collection.json`.
3.  The collection "Cart Service API" will appear.
4.  Standard endpoints provided:
    - **GET /cart/:userId** - View cart & totals.
    - **POST /cart/:userId/item** - Add item (Body: `{ "productId": 1, "quantity": 1 }`).
    - **POST /cart/:userId/coupon/apply** - Apply coupon (Body: `{ "code": "SAVE10" }`).

*Tip: Use `user123` as a test `userId`.*

### Method 2: Manual Endpoints

- **Add Item**: `POST http://localhost:3000/cart/user123/item`
  - Body: `{ "productId": 1, "quantity": 2 }`
- **View Cart**: `GET http://localhost:3000/cart/user123`
- **Apply Coupon**: `POST http://localhost:3000/cart/user123/coupon/apply`
  - Body: `{ "code": "SAVE10" }`

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
# Cart_-_Coupon_Server
