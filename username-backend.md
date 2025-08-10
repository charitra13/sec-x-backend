# Backend Implementation Guide: Username & Name Support + Flexible Login

## Overview
This guide details the exact changes needed to support both 'username' and 'name' fields in registration and allow login using either 'username' or 'email'.

## Files to Modify

### 1. User Model (`src/models/User.model.ts`)

**Add username field to schema and interface:**

```typescript
// Update the IUser interface
export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  username: string; // ADD THIS LINE
  password?: string;
  role: 'admin' | 'reader';
  avatar?: string;
  bio?: string;
  newsletter: boolean;
  isEmailVerified: boolean;
  lastLogin?: Date;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  comparePassword(password: string): Promise<boolean>;
}

// Update the schema definition
const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters']
    },
    username: { // ADD THIS ENTIRE BLOCK
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers, and underscores']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email']
    },
    // ... rest of the schema remains the same
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Add new index for username
userSchema.index({ username: 1 }); // ADD THIS LINE
userSchema.index({ createdAt: -1 });
```

### 2. Auth Controller (`src/controllers/auth.controller.ts`)

**Update registration to handle both name and username:**

```typescript
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, username, email, password } = req.body; // ADD username

    // Check if user already exists by email OR username
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] // UPDATE THIS LINE
    });
    
    if (existingUser) {
      if (existingUser.email === email) {
        throw new ConflictError('User with this email already exists');
      }
      if (existingUser.username === username) {
        throw new ConflictError('Username is already taken');
      }
    }

    // Create and save the new user
    const user = new User({ name, username, email, password }); // ADD username
    await user.save();

    // Generate a token
    const token = generateToken({
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      username: user.username // ADD THIS LINE
    });

    // Send response
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username, // ADD THIS LINE
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};
```

**Update login to support email OR username:**

```typescript
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { emailOrUsername, password } = req.body; // CHANGE from { email, password }

    // Find user by email OR username
    const user = await User.findOne({
      $or: [
        { email: emailOrUsername.toLowerCase() },
        { username: emailOrUsername.toLowerCase() }
      ]
    }).select('+password'); // UPDATE THIS ENTIRE BLOCK

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Check if the password is correct
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Generate a token
    const token = generateToken({
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      username: user.username // ADD THIS LINE
    });

    // Send response
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username, // ADD THIS LINE
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};
```

### 3. Auth Validator (`src/validators/auth.validator.ts`)

**Update validation schemas:**

```typescript
import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    name: z // ADD THIS ENTIRE BLOCK
      .string({
        required_error: 'Name is required',
      })
      .min(1, 'Name is required')
      .max(50, 'Name cannot exceed 50 characters'),
    username: z
      .string({
        required_error: 'Username is required',
      })
      .min(3, 'Username must be at least 3 characters long')
      .max(30, 'Username cannot exceed 30 characters')
      .regex(/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers, and underscores'),
    email: z
      .string({
        required_error: 'Email is required',
      })
      .email('Invalid email address'),
    password: z
      .string({
        required_error: 'Password is required',
      })
      .min(8, 'Password must be at least 8 characters long'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    emailOrUsername: z // CHANGE FROM email to emailOrUsername
      .string({
        required_error: 'Email or username is required',
      })
      .min(1, 'Email or username is required'),
    password: z
      .string({
        required_error: 'Password is required',
      })
      .min(8, 'Password must be at least 8 characters long'),
  }),
});
```

### 4. JWT Utils (`src/utils/jwt.utils.ts`)

**Update token payload interface (if exists):**

```typescript
// If you have a payload interface, update it:
interface TokenPayload {
  id: string;
  role: string;
  email: string;
  username: string; // ADD THIS LINE
}
```

### 5. Database Migration Script (Create new file: `src/scripts/add-username-migration.ts`)

**Create migration script for existing users:**

```typescript
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.model';

dotenv.config();

const migrateExistingUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('Connected to MongoDB');

    // Find users without username field
    const usersWithoutUsername = await User.find({ username: { $exists: false } });
    
    console.log(`Found ${usersWithoutUsername.length} users without username`);

    for (const user of usersWithoutUsername) {
      // Generate username from name (lowercase, remove spaces, add random number if needed)
      let baseUsername = user.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
      
      if (baseUsername.length < 3) {
        baseUsername = `user${baseUsername}`;
      }
      
      let username = baseUsername;
      let counter = 1;
      
      // Ensure uniqueness
      while (await User.findOne({ username })) {
        username = `${baseUsername}${counter}`;
        counter++;
      }
      
      // Update user with new username
      await User.updateOne({ _id: user._id }, { username });
      console.log(`Updated user ${user.name} with username: ${username}`);
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
  }
};

migrateExistingUsers();
```

### 6. Update Package.json Script

**Add migration script:**

```json
{
  "scripts": {
    "migrate:username": "ts-node src/scripts/add-username-migration.ts"
  }
}
```

## Implementation Steps

1. **Backup Database**: Always backup your database before schema changes
2. **Update User Model**: Add username field to schema and interface
3. **Run Migration**: Execute the migration script to add usernames to existing users
4. **Update Controllers**: Modify register and login logic
5. **Update Validators**: Update validation schemas
6. **Test Registration**: Verify new registrations work with both name and username
7. **Test Login**: Verify login works with both email and username
8. **Update JWT**: Ensure tokens include username
9. **Test API**: Use test-api.js or Postman to verify all endpoints

## Testing Commands

```bash
# Run migration
npm run migrate:username

# Test registration
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","username":"johndoe","email":"john@example.com","password":"password123"}'

# Test login with email
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrUsername":"john@example.com","password":"password123"}'

# Test login with username
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrUsername":"johndoe","password":"password123"}'
```

## Error Handling

Ensure proper error messages for:
- Duplicate username during registration
- Duplicate email during registration
- Invalid username format
- Username too short/long
- User not found during login with either email or username

## Notes

- Username will be stored in lowercase for consistency
- Username format: lowercase letters, numbers, and underscores only
- Minimum 3 characters, maximum 30 characters
- Both email and username remain unique in the database
- JWT tokens will include both email and username
- Migration script handles existing users by generating usernames from their names