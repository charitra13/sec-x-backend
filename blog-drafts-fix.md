# 🚀 CURSOR IMPLEMENTATION PROMPT: Optional Auth Middleware for Draft Blog Visibility

## 📋 **CONTEXT & PROBLEM STATEMENT**

**Issue**: Admin dashboard cannot see draft blogs because the `/blogs?status=all` endpoint is defined as a public route but requires admin authentication context to work properly.

**Root Cause**: The `getAllBlogs` controller has correct logic to show all blogs (including drafts) to admins when `status=all` is requested, but since the route uses no authentication middleware, `req.user` is always undefined, causing it to default to published blogs only.

**Current Broken Flow**:
1. Admin dashboard calls `/blogs?status=all` 
2. Route is public (no auth middleware) → `req.user = undefined`
3. Controller logic: `req.user?.role !== 'admin'` → true
4. Query filtered to published only → drafts excluded

## 🎯 **SOLUTION: MODULAR OPTIONAL AUTH MIDDLEWARE**

**Strategy**: Implement optional authentication middleware that allows both public access AND admin context when authenticated, maintaining clean separation of concerns.

**Architecture Benefits**:
- ✅ Single endpoint with context-aware behavior
- ✅ Reusable across multiple resources
- ✅ No code duplication
- ✅ RESTful API design
- ✅ Easy to test and maintain

## 📁 **FILES TO MODIFY**

### **File 1**: `src/middleware/auth.middleware.ts`
### **File 2**: `src/routes/blog.routes.ts`
### **File 3**: `src/controllers/blog.controller.ts` (minor update for search)

---

## 🔧 **DETAILED IMPLEMENTATION STEPS**

### **STEP 1: Add Optional Auth Middleware**

**FILE**: `src/middleware/auth.middleware.ts`

**ACTION**: Add the following functions to the existing file (after the existing `authorize` function):

```typescript
/**
 * Optional authentication middleware - doesn't fail if no token provided
 * Attaches user info to request if valid token is present
 * Useful for endpoints that should work for both public and authenticated users
 * 
 * @param req - Express request object (will have user attached if authenticated)
 * @param _res - Express response object  
 * @param next - Express next function
 */
export const optionalAuth = async (req: IAuthRequest, _res: Response, next: NextFunction) => {
  let token;

  // Check for token in Authorization header (Bearer token)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // Fallback: Check for token in cookies (for browser-based requests)
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // If token exists, try to verify it
  if (token) {
    try {
      // Verify token with existing blacklist check
      const decoded = await verifyTokenWithBlacklist(token);
      const user = await User.findById(decoded.id);

      // Only attach user if valid and active
      if (user && user.isActive) {
        req.user = {
          id: user._id.toString(),
          role: user.role,
          email: user.email
        };
        req.token = token;
      }
    } catch (error) {
      // Log invalid token attempts for security monitoring
      console.log('Invalid token in optional auth:', (error as Error).message);
      // Important: Don't fail the request - continue without user context
    }
  }

  // Always continue to next middleware/controller (this is key!)
  next();
};

/**
 * Conditional auth middleware - dynamically requires auth based on request conditions
 * Useful for endpoints that need auth only in certain scenarios
 * 
 * @param condition - Function that determines if auth is required based on request
 * @returns Middleware function
 */
export const conditionalAuth = (condition: (req: IAuthRequest) => boolean) => {
  return async (req: IAuthRequest, res: Response, next: NextFunction) => {
    if (condition(req)) {
      // Use strict protect middleware if condition is met
      return protect(req, res, next);
    } else {
      // Use optional auth if condition is not met
      return optionalAuth(req, res, next);
    }
  };
};
```

### **STEP 2: Update Blog Routes**

**FILE**: `src/routes/blog.routes.ts`

**ACTION**: Replace the existing public routes section with:

```typescript
// FIND this section in the file:
// Public routes
router.get('/', getAllBlogs);
router.get('/search', searchBlogs);
router.get('/slug/:slug', getBlogBySlug);

// REPLACE with:
// Public routes with optional authentication
// This allows both public access AND admin context when authenticated
router.get('/', optionalAuth, getAllBlogs);
router.get('/search', optionalAuth, searchBlogs);
router.get('/slug/:slug', optionalAuth, getBlogBySlug);
```

**ACTION**: Also update the imports at the top of the file:

```typescript
// FIND this import line:
import { protect, authorize } from '../middleware/auth.middleware';

// REPLACE with:
import { protect, authorize, optionalAuth } from '../middleware/auth.middleware';
```

### **STEP 3: Update Search Controller (Optional Enhancement)**

**FILE**: `src/controllers/blog.controller.ts`

**ACTION**: Find the `searchBlogs` function and replace it with this enhanced version:

```typescript
// FIND the existing searchBlogs function and REPLACE with:
export const searchBlogs = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const keyword = req.query.keyword
    ? {
        title: {
          $regex: req.query.keyword,
          $options: 'i',
        },
      }
    : {};

  // Build query based on user context
  const query: any = { ...keyword };
  
  // Apply status filter based on user role
  if (req.user?.role === 'admin') {
    // Admins can search all blogs including drafts
    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }
    // If no status specified or status=all, don't add status filter (search all)
  } else {
    // Non-admin users can only search published blogs
    query.status = 'published';
  }

  const blogs = await Blog.find(query)
    .populate('author', 'name email avatar')
    .sort('-createdAt');
    
  res.json({ 
    success: true,
    blogs: blogs,
    totalResults: blogs.length
  });
});
```

---

## ✅ **VERIFICATION & TESTING STEPS**

### **1. Immediate Testing**

After implementing the changes, test the following scenarios:

**Test 1: Admin Dashboard (Authenticated Request)**
```bash
# Should return all blogs including drafts
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     "http://localhost:8080/api/blogs?status=all"
```

**Test 2: Public Access (No Authentication)**
```bash
# Should return only published blogs
curl "http://localhost:8080/api/blogs"
```

**Test 3: Public Access with status=all (No Authentication)**
```bash
# Should return only published blogs (ignores status=all)
curl "http://localhost:8080/api/blogs?status=all"
```

**Test 4: Frontend Admin Dashboard**
- Navigate to admin dashboard
- Verify network request includes Authorization header
- Confirm response includes draft blogs

### **2. Behavior Verification**

**Expected Behaviors After Implementation**:

| User Type | Request | Expected Result |
|-----------|---------|----------------|
| Admin (authenticated) | `/blogs?status=all` | All blogs (published + draft) |
| Admin (authenticated) | `/blogs?status=published` | Published blogs only |
| Admin (authenticated) | `/blogs?status=draft` | Draft blogs only |
| Admin (authenticated) | `/blogs` | All blogs (admin sees everything) |
| Public (no auth) | `/blogs?status=all` | Published blogs only |
| Public (no auth) | `/blogs` | Published blogs only |
| Public (no auth) | `/blogs?status=draft` | Published blogs only (ignores draft param) |

### **3. Database Verification**

**Check if draft blogs exist in database**:
```javascript
// In MongoDB shell or compass
db.blogs.find({status: 'draft'}).count()
db.blogs.find({status: 'draft'}).limit(5)
```

### **4. Frontend Network Tab Check**

**Verify admin requests include authentication**:
1. Open admin dashboard
2. Open browser DevTools → Network tab
3. Look for `/blogs?status=all` request
4. Confirm `Authorization: Bearer ...` header is present
5. Check response includes draft blogs

---

## 🔍 **TROUBLESHOOTING GUIDE**

### **Issue**: Still not seeing draft blogs after implementation

**Debug Steps**:
1. **Check Database**: Confirm draft blogs exist
   ```bash
   db.blogs.find({status: 'draft'})
   ```

2. **Check Authentication**: Verify admin token is being sent
   ```bash
   # Network tab should show Authorization header
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **Check User Role**: Confirm user has admin role
   ```bash
   # Test token decoding
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        "http://localhost:8080/api/auth/me"
   ```

4. **Check Middleware Order**: Ensure optionalAuth is called before getAllBlogs

5. **Check Console Logs**: Look for authentication errors in server logs

### **Issue**: Public access broken

**Debug Steps**:
1. Test without any headers: `curl "http://localhost:8080/api/blogs"`
2. Verify no authentication errors in logs
3. Confirm published blogs are returned

### **Issue**: TypeScript compilation errors

**Fix**: Ensure imports are updated correctly in all files

---

## 📚 **ADDITIONAL ENHANCEMENTS (OPTIONAL)**

### **Add Request Logging for Debugging**

Add this to optionalAuth middleware for development:

```typescript
// In development mode, log auth attempts
if (process.env.NODE_ENV === 'development') {
  console.log(`[OptionalAuth] ${req.method} ${req.path}`, {
    hasToken: !!token,
    hasUser: !!req.user,
    userRole: req.user?.role,
    queryParams: req.query
  });
}
```

### **Add Response Headers for Client Debugging**

Add this to optionalAuth middleware:

```typescript
// Add header to indicate authentication status
_res.setHeader('X-Auth-Status', req.user ? 'authenticated' : 'anonymous');
if (req.user) {
  _res.setHeader('X-User-Role', req.user.role);
}
```

---

## 🎯 **SUCCESS CRITERIA**

**Implementation is successful when**:

1. ✅ Admin dashboard shows both published and draft blogs
2. ✅ Public blog page shows only published blogs  
3. ✅ No authentication errors in console
4. ✅ `/blogs?status=all` works differently for admin vs public
5. ✅ All existing functionality remains intact
6. ✅ TypeScript compiles without errors
7. ✅ Tests pass (if you have existing tests)

---

## 🚨 **CRITICAL NOTES**

1. **Don't modify the existing `protect` and `authorize` middleware** - they should remain unchanged
2. **The `getAllBlogs` controller logic is already correct** - it just needs the user context
3. **Make sure to import `optionalAuth` in routes file** - missing import will cause errors
4. **Test both authenticated and unauthenticated scenarios** - both should work
5. **Verify the middleware order** - optionalAuth must come before the controller

---

## 📝 **COMMIT MESSAGE SUGGESTION**

```
feat: implement optional auth middleware for admin blog visibility

- Add optionalAuth middleware for context-aware endpoints
- Enable admin dashboard to see draft blogs via status=all
- Maintain public access to published blogs only
- Improve search functionality with role-based filtering
- Fix: Admin can now view and manage draft blogs in dashboard

Resolves draft blog visibility issue while maintaining API modularity
```

---

This implementation follows modular architecture principles, maintains backward compatibility, and provides a scalable solution for role-based content visibility across the entire application.