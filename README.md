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

## 📝 Next Steps
This project is continuously evolving. The next phase of development will focus on:
- Comment system enhancements
- Analytics dashboard
- Real-time notifications
- Email integration
- Testing

## 📝 Changelog

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