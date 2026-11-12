# AuraMart --- Full-Stack E-Commerce Platform

A modern, full-stack e-commerce application built with **Next.js, React,
TypeScript, Tailwind CSS, and Neon PostgreSQL**. AuraMart includes a
customer-facing shopping experience and an admin area for managing the
store.

> **Live application:**
> https://project-auramarte-commerceside.vercel.app\
> **Repository:** https://github.com/Sabbirhossen143/Project_AuraMart

------------------------------------------------------------------------

## Table of Contents

-   [Overview](#overview)
-   [Features](#features)
-   [Technology Stack](#technology-stack)
-   [Application Architecture](#application-architecture)
-   [Getting Started](#getting-started)
-   [Environment Variables](#environment-variables)
-   [Database](#database)
-   [Admin Account Setup](#admin-account-setup)
-   [Available Scripts](#available-scripts)
-   [Deployment](#deployment)
-   [Security Notes](#security-notes)
-   [Project Status](#project-status)
-   [Contributing](#contributing)
-   [License](#license)

------------------------------------------------------------------------

## Overview

AuraMart is a full-stack e-commerce project designed to provide a
complete shopping workflow, from browsing products to placing and
managing orders.

The application uses **Next.js App Router** for its web application and
API routes. **Neon PostgreSQL** is used as the primary database, while
**Cloudinary** handles product image uploads. Authentication is
implemented with **NextAuth.js** and password hashing with **bcryptjs**.

The project has a customer storefront as well as dedicated account and
administration sections.

## Features

### Customer Storefront

-   Browse the product catalogue.
-   View individual product details.
-   Browse product categories.
-   Add products to the shopping cart.
-   Update cart item quantities and remove items.
-   Save products to a wishlist.
-   Prevent duplicate wishlist entries and show feedback to the user.
-   Proceed through checkout.
-   Place orders using the implemented Cash on Delivery (COD) flow.
-   View account information and order history.
-   View individual order details.
-   Manage profile information.

### Authentication and Accounts

-   User registration and login.
-   Session-based authentication with NextAuth.js.
-   Password hashing with bcryptjs.
-   Protected account and administrative functionality.
-   Active/inactive user status handling.

### Admin Dashboard

-   Manage products, including creating and editing products.
-   Manage product categories.
-   View and manage customer orders.
-   Update order statuses.
-   Manage COD payment status.
-   View users.
-   Update user roles and account active status.
-   Upload product images through Cloudinary.

### Order and Inventory Workflow

-   Create orders from the checkout flow.
-   Track order status.
-   Deduct product stock when an order is placed.
-   Restore stock when an eligible order is cancelled.
-   Manage COD payment status from the admin area.

------------------------------------------------------------------------

## Technology Stack

  Area               Technology
  ------------------ ----------------------------------
  Framework          Next.js 16.4.4 (App Router)
  UI Library         React 19.3
  Language           TypeScript
  Styling            Tailwind CSS 4
  Database           Neon PostgreSQL
  Database access    `@neondatabase/serverless`, `pg`
  Authentication     NextAuth.js 4
  Password hashing   bcryptjs
  Image hosting      Cloudinary
  Validation         Zod
  Icons              Lucide React
  Notifications      Sonner
  Deployment         Vercel

------------------------------------------------------------------------

## Application Architecture

AuraMart follows a feature-oriented structure using Next.js App Router,
API route handlers, and repository modules for database operations.

``` text
Project_AuraMart/
├── app/
│   ├── (store)/
│   │   └── products/
│   ├── account/
│   ├── admin/
│   ├── api/
│   │   ├── admin/
│   │   ├── auth/
│   │   ├── cart/
│   │   ├── categories/
│   │   ├── orders/
│   │   ├── products/
│   │   └── wishlist/
│   ├── cart/
│   ├── checkout/
│   ├── login/
│   ├── register/
│   └── wishlist/
├── lib/
│   ├── auth/
│   └── db.ts
├── repositories/
│   ├── category.repository.ts
│   ├── product.repository.ts
│   ├── user.repository.ts
│   ├── cart.repository.ts
│   ├── wishlist.repository.ts
│   └── order.repository.ts
├── scripts/
│   └── create-admin.mjs
├── types/
├── public/
├── package.json
└── README.md
```

*This is a high-level map of the main application areas, not an
exhaustive listing of every file.*

### Request and Data Flow

1.  The browser requests a page or sends a request to an API route.
2.  Next.js handles the page rendering or API request.
3.  API handlers validate input and apply authentication/authorization
    checks where required.
4.  Repository modules execute database operations against Neon
    PostgreSQL.
5.  The API returns a response to the client.
6.  Cloudinary is used for supported image-upload operations.

------------------------------------------------------------------------

## Getting Started

### Prerequisites

Install the following before running the project:

-   [Node.js](https://nodejs.org/) --- use a current LTS release.
-   npm (included with Node.js).
-   A [Neon](https://neon.tech/) PostgreSQL database.
-   A [Cloudinary](https://cloudinary.com/) account for image uploads.
-   Git.

### 1. Clone the repository

``` bash
git clone https://github.com/Sabbirhossen143/Project_AuraMart.git
cd Project_AuraMart
```

### 2. Install dependencies

``` bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file in the project root. Add the variables listed
in the [Environment Variables](#environment-variables) section.

Do not commit `.env.local` to Git.

### 4. Configure the database

Create or select your Neon PostgreSQL database and set `DATABASE_URL` to
its connection string.

Make sure the database has the tables, constraints, and indexes required
by the application before starting the app. Use the project's current
database schema/setup materials when preparing a fresh database; do not
assume that creating a Neon project alone creates the application
tables.

### 5. Start the development server

``` bash
npm run dev
```

Open <http://localhost:3000> in your browser.

The development server supports hot reloading. Changes to files in the
application are reflected during development.

------------------------------------------------------------------------

## Environment Variables

Create `.env.local` in the project root.

``` env
# Application URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000

# NextAuth
NEXTAUTH_SECRET=replace_with_a_long_random_secret

# Neon PostgreSQL
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

### Variable Reference

  ----------------------------------------------------------------------------
  Variable                                      Required Description
  ------------------------- ---------------------------- ---------------------
  `DATABASE_URL`                                     Yes Neon PostgreSQL
                                                         connection string.

  `NEXTAUTH_SECRET`                                  Yes Secret used by
                                                         NextAuth.js. Use a
                                                         strong, unique value.

  `NEXTAUTH_URL`                                     Yes Canonical application
                                                         URL used by
                                                         NextAuth.js.

  `NEXT_PUBLIC_APP_URL`                              Yes Public base URL used
                                                         by the application.
                                                         Values with the
                                                         `NEXT_PUBLIC_` prefix
                                                         may be exposed to the
                                                         browser.

  `CLOUDINARY_CLOUD_NAME`              For image uploads Cloudinary cloud
                                                         name.

  `CLOUDINARY_API_KEY`                 For image uploads Cloudinary API key.

  `CLOUDINARY_API_SECRET`              For image uploads Cloudinary API
                                                         secret.
  ----------------------------------------------------------------------------

### Local and Production Values

For local development, use:

``` env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
```

For Vercel production, use your deployed domain for both URL variables.
For the current deployment:

``` env
NEXT_PUBLIC_APP_URL=https://project-auramarte-commerceside.vercel.app
NEXTAUTH_URL=https://project-auramarte-commerceside.vercel.app
```

Set the production `DATABASE_URL` to the intended Neon production
database connection string.

### Generating a NextAuth Secret

You can generate a strong random secret with:

``` bash
openssl rand -base64 32
```

Keep secret values private. Never paste database connection strings, API
secrets, passwords, or authentication secrets into public issues,
screenshots, or source control.

------------------------------------------------------------------------

## Database

AuraMart uses **Neon PostgreSQL** as its primary application database.

The application database connection is configured in:

``` text
lib/db.ts
```

Database operations are organized into repository modules under:

``` text
repositories/
```

The repositories cover the application's user, product, category, cart,
wishlist, and order data operations.

### Database Setup Checklist

For a new environment:

1.  Create a Neon PostgreSQL project.
2.  Copy the connection string for the correct database and branch.
3.  Set it as `DATABASE_URL`.
4.  Apply the database schema and indexes required by the current
    application code.
5.  Confirm that the application can connect to Neon.
6.  Create or verify an administrator account before testing admin
    features.

**Important:** Keep development and production databases separate where
possible. Never point a production deployment at a local database
endpoint.

------------------------------------------------------------------------

## Admin Account Setup

The project includes an administrator creation script:

``` text
scripts/create-admin.mjs
```

The script reads these local environment variables:

``` env
ADMIN_NAME=Your Admin Name
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=use_a_strong_unique_password
```

Create the admin account from the project root with:

``` bash
node --env-file=.env.local scripts/create-admin.mjs
```

The script hashes the password with bcrypt before inserting the account
into the `users` table. It checks whether the email is already
registered and does not create a duplicate account.

### Notes

-   Run the script only after the database schema is ready.
-   Use a strong, unique administrator password.
-   Do not commit administrator credentials.
-   The `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` variables are
    for the account-creation script; they are not required as Vercel
    runtime variables once the administrator account has been created.
-   Do not run the script repeatedly for an existing administrator
    email.

------------------------------------------------------------------------

## Available Scripts

  -----------------------------------------------------------------------
  Command                             Description
  ----------------------------------- -----------------------------------
  `npm run dev`                       Starts the Next.js development
                                      server.

  `npm run build`                     Creates an optimized production
                                      build.

  `npm run start`                     Starts the production server after
                                      a successful build.

  `npm run lint`                      Runs ESLint.

  `npx tsc --noEmit`                  Runs TypeScript type checking
                                      without emitting files.
  -----------------------------------------------------------------------

### Production Build Check

Before deploying, run:

``` bash
npx tsc --noEmit
npm run build
```

Resolve any errors before deploying.

------------------------------------------------------------------------

## Deployment

AuraMart is configured for deployment on [Vercel](https://vercel.com/).

### Deploy with Vercel

1.  Push the project to GitHub.
2.  Open [Vercel](https://vercel.com/).
3.  Select **Add New → Project**.
4.  Import `Sabbirhossen143/Project_AuraMart`.
5.  Keep the root directory as `./`.
6.  Select the Next.js framework preset.
7.  Add the required environment variables.
8.  Deploy the project.

Vercel normally detects the Next.js build settings automatically. Keep
the default build and output settings unless the project configuration
requires otherwise.

### Vercel Environment Variables

Add the following runtime variables to the appropriate Vercel
environments:

-   `DATABASE_URL`
-   `NEXTAUTH_SECRET`
-   `NEXTAUTH_URL`
-   `NEXT_PUBLIC_APP_URL`
-   `CLOUDINARY_CLOUD_NAME`
-   `CLOUDINARY_API_KEY`
-   `CLOUDINARY_API_SECRET`

Use the correct Neon production connection string. Mark sensitive values
such as `DATABASE_URL`, `NEXTAUTH_SECRET`, and `CLOUDINARY_API_SECRET`
as secret/private in Vercel. Public configuration values such as
`NEXT_PUBLIC_APP_URL` should use config visibility.

After changing environment variables, trigger a new deployment so the
build receives the updated values.

### Post-Deployment Verification

After deployment, test the live application:

-   Open the home page and browse products.
-   Open a product details page.
-   Register or log in with a test customer account.
-   Verify cart add, quantity update, and remove operations.
-   Verify wishlist add and remove operations.
-   Complete a test checkout using the configured COD flow.
-   Verify the order appears in the customer account.
-   Log in as an administrator and verify admin-only pages and actions.
-   Test product/category management and image upload.
-   Check order status and COD payment updates.
-   Review Vercel deployment logs for runtime errors.

Use test data and avoid placing unintended real orders.

------------------------------------------------------------------------

## Security Notes

-   Keep `.env.local` out of Git.
-   Never expose `DATABASE_URL`, `NEXTAUTH_SECRET`,
    `CLOUDINARY_API_SECRET`, or account passwords.
-   Treat all `NEXT_PUBLIC_` variables as public because they can be
    included in browser-side code.
-   Use separate credentials and database environments for development
    and production.
-   Keep administrator credentials strong and private.
-   Verify authorization on server-side API routes; hiding an admin page
    in the UI is not sufficient protection.
-   Do not commit database dumps, credentials, private keys, or
    production logs containing secrets.
-   Review Vercel logs and database access when troubleshooting
    production issues.

------------------------------------------------------------------------

## Project Status

AuraMart has been migrated from its earlier DynamoDB-based
implementation to **Neon PostgreSQL**. The active application database
layer uses Neon/PostgreSQL.

The following areas have been exercised during development:

-   Product operations.
-   Cart add, update, and remove.
-   Checkout and order creation.
-   Stock deduction and restoration during the tested order/cancellation
    flows.
-   Order status and COD payment updates.
-   Wishlist add/remove and duplicate-entry feedback.
-   Administrator login and user management.
-   TypeScript checking and Next.js production build.

Production behavior must still be verified in the deployed Vercel
environment after each deployment.

------------------------------------------------------------------------

## Contributing

Contributions and suggestions are welcome.

1.  Fork the repository.

2.  Create a feature branch:

    ``` bash
    git checkout -b feature/your-feature-name
    ```

3.  Make your changes.

4.  Run type checking and the production build:

    ``` bash
    npx tsc --noEmit
    npm run build
    ```

5.  Commit and push your changes.

6.  Open a pull request with a clear description of the changes.

------------------------------------------------------------------------

## License

No license has been specified for this repository yet. All rights are
reserved by the repository owner unless a license is added.

------------------------------------------------------------------------

## Author

**Sabbir Hossen**

-   GitHub: [@Sabbirhossen143](https://github.com/Sabbirhossen143)
-   Project:
    [AuraMart](https://github.com/Sabbirhossen143/Project_AuraMart)
-   Live Demo: [AuraMart
    Live](https://project-auramarte-commerceside.vercel.app)
