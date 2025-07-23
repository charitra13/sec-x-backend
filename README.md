# sec-x-backend

This repository contains the backend for **SecurityX**, a full-featured blog application built with a modern technology stack. It provides a robust and secure API for managing users, blog posts, comments, and more, with a focus on security and performance.

## ✨ Key Features

- **Authentication**: Secure user registration and login using JWT (JSON Web Tokens).
- **Role-Based Access Control (RBAC)**: Differentiated user roles (`admin`, `reader`) to manage permissions for creating, editing, and viewing content.
- **Complete Blog Management**: Full CRUD (Create, Read, Update, Delete) functionality for blog posts.
- **Advanced Blog Features**:
    - Automatic `slug` generation for SEO-friendly URLs.
    - Calculation of estimated `readingTime`.
    - Tracking for `views`, `likes`, and `shares`.
    - Support for `draft` and `published` statuses.
    - SEO metadata fields.
- **Image Uploads**: Integrated with Cloudinary for efficient image hosting and transformations.
- **Comment System**: Users can comment on blog posts.
- **Input Validation**: Uses `zod` for validating all incoming request data to ensure data integrity.
- **Security**:
    - Password hashing with `bcryptjs`.
    - `helmet` for protection against common web vulnerabilities.
    - `express-rate-limit` to prevent brute-force attacks.
- **Comprehensive API**: Well-structured and documented API endpoints for all features.
- **Database Seeding**: Includes scripts to populate the database with initial data for testing and development.

## 🛠️ Technology Stack

- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JSON Web Tokens (JWT)
- **Image Handling**: Multer and Cloudinary
- **Validation**: Zod
- **Security**: Helmet, Express-Rate-Limit, Bcrypt.js
- **Other Libraries**: `cors`, `morgan`, `compression`, `slugify`

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v16 or higher)
- [MongoDB](https://www.mongodb.com/)
- A [Cloudinary](https://cloudinary.com/) account for image uploads.
- [OpenSSL](https://www.openssl.org/) (for HTTPS development setup)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/charitra13/sec-x-backend.git
    cd sec-x-backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root of the project by copying the example file:
    ```bash
    cp env.example .env
    ```
    Update the `.env` file with your configuration, including your MongoDB connection string and Cloudinary credentials.

4.  **Run the server:**

    **HTTP Development:**
    ```bash
    npm run dev
    ```
    The server will be running at `http://localhost:8080`.

    **HTTPS Development (Recommended):**
    ```bash
    # Generate SSL certificates for local development
    npm run generate-certs
    
    # Start HTTPS development server
    npm run dev:https
    ```
    The server will be running at `https://localhost:8080`.

    **Production:**
    ```bash
    npm start
    ```
    The server will be running at `http://localhost:8080`.

## ⚙️ API Endpoints

The API includes endpoints for authentication, user management, blog posts, and more. For detailed information on the available endpoints, please refer to the `src/routes/` directory.

- `/api/auth` - Authentication routes (login, register)
- `/api/users` - User management
- `/api/blogs` - Blog post operations
- `/api/comments` - Comment management
- `/api/health` - Health check

## 🔐 HTTPS Development

## 🛡️ CORS Security Implementation (Phase 3 - Production Hardening)

### Overview
This project implements enterprise-level CORS security with production hardening features:

### Key Features Implemented:

#### 1. **Smart Rate Limiting**
- **OPTIONS-specific rate limiting**: 20 preflight requests per 5 minutes per IP
- **Suspicious origin rate limiting**: 3 requests per 15 minutes for blocked origins
- **Adaptive rate limiting**: Different limits based on request characteristics

#### 2. **Origin Whitelist Management**
- **Dynamic origin management**: Add/remove origins via API
- **Environment-based filtering**: Separate origins for dev/staging/production
- **Usage tracking**: Monitor origin usage patterns
- **Admin-only access**: Secure origin management endpoints

#### 3. **CORS Policy Documentation**
- **Comprehensive documentation**: Complete CORS policy guide
- **Schema validation**: JSON schema for CORS configuration
- **Troubleshooting guides**: Common issues and solutions
- **Best practices**: Security recommendations

### API Endpoints Added:

#### Origin Management (Admin Only)
- `GET /api/admin/origins` - List all managed origins
- `POST /api/admin/origins` - Add new origin
- `PUT /api/admin/origins/:originId` - Update origin
- `DELETE /api/admin/origins/:originId` - Remove origin

#### CORS Documentation
- `GET /api/cors/docs` - Complete CORS policy documentation
- `GET /api/cors/schema` - CORS configuration schema

#### CORS Debugging
- `GET /api/cors-debug/status` - Check current CORS configuration
- `GET /api/cors-debug/alerts` - View CORS violation alerts (admin)
- `POST /api/cors-debug/test-origin` - Test origin allowance (admin)

### Validation Scripts
```bash
# Validate CORS configuration
npm run validate:cors

# Pre-deployment validation
npm run pre-deploy
```

### Security Features:
- ✅ **No wildcard origins** - Only specific domains allowed
- ✅ **HTTPS enforcement** - Production origins must use HTTPS
- ✅ **Origin validation** - Every request validated
- ✅ **Suspicious pattern detection** - Monitors and logs suspicious origins
- ✅ **Rate limiting** - Prevents CORS abuse
- ✅ **Comprehensive logging** - Detailed CORS violation tracking
- ✅ **Admin controls** - Secure origin management
- ✅ **Documentation** - Complete policy and troubleshooting guides

This project supports HTTPS development for a more production-like local environment:

### SSL Certificate Generation
```bash
npm run generate-certs
```
This command generates self-signed SSL certificates for localhost development.

### HTTPS Development Server
```bash
npm run dev:https
```
Starts the development server with HTTPS support using the generated certificates.

### CORS Configuration
The application includes enhanced CORS configuration that supports:
- Dynamic origin validation
- Development and production environments
- Detailed CORS violation logging
- Support for localhost HTTPS development

### Available Scripts
- `npm run dev` - HTTP development server
- `npm run dev:https` - HTTPS development server
- `npm run generate-certs` - Generate SSL certificates
- `npm run setup-https` - Generate certificates and start HTTPS server

## 📝 Next Steps
This project is continuously evolving. The next phase of development will focus on:
- Comment system enhancements
- Analytics dashboard
- Real-time notifications
- Email integration
- Testing

## 📝 Changelog

### v1.2.3 (2024-12-19)

- **Fix**: Resolved TypeScript compilation errors (TS6133, TS7030) in CORS controllers and middleware
- **Enhancement**: Fixed unused parameter warnings by prefixing unused `req` parameters with underscore
- **Fix**: Added explicit return statements to all async controller functions to satisfy TypeScript compiler
- **Cleanup**: Removed unused variables in rate limiter middleware
- **Build**: Successfully validated TypeScript compilation with zero errors
- **Quality**: Improved code quality by addressing all TypeScript strict mode violations

### v1.2.2 (2024-12-19)

- **Feat**: Implemented comprehensive CORS alert system with severity-based monitoring
- **Feat**: Added CORS debugging endpoints for status checking and alert management
- **Feat**: Created alert system with violation counting and threshold-based severity
- **Feat**: Integrated alert system with CORS error handler and origin validation middleware
- **Security**: Enhanced monitoring with detailed alert logging and external monitoring support
- **API**: Added new CORS debug endpoints (/api/cors-debug/status, /api/cors-debug/alerts, /api/cors-debug/test-origin)
- **Monitoring**: Implemented alert statistics and top violating origins tracking
- **Fix**: Resolved TypeScript compilation errors in alert system and debug controller

### v1.2.1 (2024-12-19)

- **Feat**: Implemented comprehensive origin validation middleware with suspicious pattern detection
- **Feat**: Added cross-referencing validation between origin and referer headers
- **Feat**: Created blocking middleware for requests with excessive warnings
- **Security**: Enhanced CORS security with detailed warning logging and pattern analysis
- **Fix**: Resolved TypeScript compilation errors in CORS error handler and origin validation middleware
- **Enhancement**: Added proper return type annotations for all middleware functions
- **Integration**: Successfully integrated origin validation with existing CORS configuration

### v1.2.0 (2024-12-19)

- **Feat**: Added HTTPS development server support with self-signed certificates
- **Feat**: Implemented enhanced CORS configuration with dynamic origin validation
- **Feat**: Added CORS error handling middleware with detailed logging
- **Feat**: Created generate-certs script for local SSL certificate generation
- **Enhancement**: Added new npm scripts for HTTPS development (dev:https, generate-certs, setup-https)
- **Enhancement**: Updated package.json with cross-env and https-localhost dependencies
- **Refactor**: Refactored index.ts to support both HTTP and HTTPS servers
- **Security**: Added comprehensive CORS logging and error handling
- **Support**: Added support for localhost HTTPS development environment

### v1.1.3 (2024-12-19)

- **Fix**: Enhanced CORS configuration to resolve frontend connectivity issues.
- **Enhancement**: Added comprehensive Access-Control-Allow-Methods including GET, POST, PUT, DELETE, PATCH, OPTIONS.
- **Security**: Added explicit Access-Control-Allow-Headers including Authorization and Content-Type for proper auth handling.
- **Improvement**: Added support for https://sec-x.netlify.app origin in CORS configuration.
- **Compatibility**: Added optionsSuccessStatus: 200 for better legacy browser support.
- **Feature**: Added exposedHeaders configuration for client-side header access.

### v1.1.2 (2024-12-19)

- **Fix**: Resolved Axios 400 error in comment system by adding proper validation to GET comments endpoint.
- **Enhancement**: Added `getCommentsSchema` validation to prevent invalid blogId parameters from causing server errors.
- **Improvement**: Enhanced error handling in `getCommentsForBlog` controller with ObjectId validation and blog existence check.
- **Security**: Added validation middleware to all comment routes including GET and DELETE operations for consistent security.
- **Validation**: Added `deleteCommentSchema` to ensure comment deletion requests are properly validated.

### v1.1.1 (2024-07-13)

- **Fix**: Resolved TypeScript compilation error TS6192 that was causing Render deployment failures.
- **Cleanup**: Removed unused validation schema imports from `blog.controller.ts` - these schemas are correctly used in the routes layer for request validation, not in controllers.
- **Architecture**: Confirmed proper separation of concerns - validation happens at route level, business logic in controllers.

### v1.0.2 (2024-07-14)

- **Feat**: Updated CORS configuration to allow requests from the frontend application hosted at `https://sec-x.vercel.app`.

### v1.0.1 (2024-07-13)

- **Fix**: Adjusted the `start` script in `package.json` to correct the path for the compiled entry point, resolving a deployment failure on Render. The execution environment on Render was starting from the `src` directory, and the script now accounts for this.

### v1.0.2 (2024-07-13)

- **Fix**: Made the `start` script more robust by chaining the `build` command. It now runs `npm run build` before `node dist/index.js` to ensure the compiled code is always present in the runtime environment on Render.

### v1.1.0 (2024-07-13)

- **Refactor**: Resolved multiple TypeScript and linting errors across the codebase.
- **Fix**: Corrected a module import path in `blog.controller.ts`.
- **Cleanup**: Removed numerous unused variables and imports from controllers and routes to improve code quality.