import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy, Profile as GoogleProfile } from "passport-google-oauth20";
import { Express, Request } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

// Extend the session type to include our custom properties
declare module 'express-session' {
  interface SessionData {
    returnTo?: string;
  }
}

// Extend Express Request with user property
declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const PostgresSessionStore = connectPg(session);
const scryptAsync = promisify(scrypt);

// Helper functions for password handling
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // Create session store using PostgreSQL
  const sessionStore = new PostgresSessionStore({
    pool,
    createTableIfMissing: true,
  });

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "nutrition-tracker-secret",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure local strategy for email/password authentication
  passport.use(
    new LocalStrategy({
      usernameField: 'email',
      passwordField: 'password'
    }, async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email);
        
        // Handle cases where user doesn't exist or has no password (Google-only user)
        if (!user || !user.password) {
          return done(null, false);
        }
        
        // Verify password
        const isPasswordValid = await comparePasswords(password, user.password);
        if (!isPasswordValid) {
          return done(null, false);
        }
        
        // Update last login time
        await storage.updateUser(user.id, {});
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );
  
  // Configure Google OAuth strategy for passport
  console.log('Google Client ID exists:', !!process.env.GOOGLE_CLIENT_ID);
  console.log('Google Client Secret exists:', !!process.env.GOOGLE_CLIENT_SECRET);
  console.log('Environment variables:', Object.keys(process.env).filter(key => key.includes('GOOGLE')));
  
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    console.log('Setting up Google OAuth strategy');
    // Get the Replit domain from the environment or use localhost for development
    // For debugging, output the actual domain
    console.log('REPL_ID:', process.env.REPL_ID);
    console.log('REPL_SLUG:', process.env.REPL_SLUG);
    console.log('REPL_OWNER:', process.env.REPL_OWNER);
    
    // Track currently registered redirect URI (for verification)
    // For Google OAuth configuration, add the following redirect URIs:
    // 1. https://workspace.davidackerman1.repl.co/api/auth/google/callback
    // 2. https://{REPL_ID}.id.replit.app/api/auth/google/callback
    
    let callbackURL;
    // Determine the callback URL based on the environment
    if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
      // Production environment in Replit
      callbackURL = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/api/auth/google/callback`;
      console.log('Using production callback URL:', callbackURL);
    } else if (process.env.REPL_ID) {
      // Development environment in Replit
      callbackURL = `https://${process.env.REPL_ID}.id.replit.app/api/auth/google/callback`;
      console.log('Using development callback URL:', callbackURL);
    } else {
      // Local development
      callbackURL = 'http://localhost:5000/api/auth/google/callback';
      console.log('Using local callback URL:', callbackURL);
    }
      
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL,
          // Additional parameters to help with debugging
          passReqToCallback: true
        },
        async (req: any, accessToken: string, refreshToken: string, profile: any, done: any) => {
          // Log the incoming request to debug potential issues
          console.log('Google auth callback received for profile:', profile.id);
          try {
            // Extract profile information
            const email = profile.emails && profile.emails[0] && profile.emails[0].value;
            if (!email) {
              return done(new Error('No email provided from Google'));
            }
            
            // Get profile picture
            const profilePicture = profile.photos && profile.photos[0] && profile.photos[0].value;
            
            // Check if user already exists with this Google ID
            let user = await storage.getUserByGoogleId(profile.id);
            
            // If not found by Google ID, try to find by email (for existing users who want to link Google)
            if (!user) {
              user = await storage.getUserByEmail(email);
              
              if (user) {
                // Existing user found by email - link Google account to it
                user = await storage.updateUser(user.id, {
                  googleId: profile.id,
                  profilePicture: profilePicture || user.profilePicture
                });
                console.log(`Linked Google account to existing user: ${email}`);
              } else {
                // No user found - create a new one
                user = await storage.createUser({
                  name: profile.displayName || email.split('@')[0],
                  email,
                  googleId: profile.id,
                  profilePicture
                });
                console.log(`Created new user from Google auth: ${email}`);
              }
            } else {
              // Update user profile with latest Google info
              user = await storage.updateUser(user.id, {
                profilePicture: profilePicture || user.profilePicture
              });
            }
            
            return done(null, user);
          } catch (error) {
            console.error("Google authentication error:", error);
            return done(error);
          }
        }
      )
    );
  } else {
    console.warn("Google OAuth not configured - GOOGLE_CLIENT_ID and/or GOOGLE_CLIENT_SECRET missing");
  }

  // Serialize user to session
  passport.serializeUser((user, done) => done(null, user.id));

  // Deserialize user from session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // API endpoint for registration
  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByEmail(req.body.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      req.login(user, (err) => {
        if (err) return next(err);
        // Remove password from response
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // API endpoint for login
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: Express.User | false, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      req.login(user, (err: any) => {
        if (err) return next(err);
        // Remove password from response
        const { password, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  // API endpoint for logout
  app.post("/api/logout", (req, res, next) => {
    req.logout((err: any) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // API endpoint to get current user
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    // Remove password from response
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });
  
  // Google OAuth routes
  console.log('Registering Google OAuth routes');
  
  // We'll unconditionally register the routes, but the strategy might not be available
  // Route to initiate Google OAuth flow
  app.get('/api/auth/google', (req, res, next) => {
    console.log('Google auth route accessed');
    console.log('Request query:', req.query);
    
    // Store the referrer in the session so we can redirect back after auth
    if (req.query.from && typeof req.query.from === 'string') {
      if (req.session) {
        req.session.returnTo = req.query.from;
        console.log('Set returnTo in session:', req.query.from);
      }
    }
    
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(503).json({
        error: 'Google authentication is not configured',
        message: 'The server administrator needs to set up Google OAuth credentials'
      });
    }
    
    // Get host from request
    // In Replit environment, we should use a specific domain format
    let dynamicCallbackURL;
    
    if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
      // We're in a Replit environment, use the repl.co domain
      dynamicCallbackURL = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/api/auth/google/callback`;
    } else {
      // Local development or other environment
      const protocol = req.protocol || 'http';
      const host = req.get('host') || 'localhost:5000';
      dynamicCallbackURL = `${protocol}://${host}/api/auth/google/callback`;
    }
    console.log('Dynamic callback URL:', dynamicCallbackURL);
    
    // Use the dynamic callback URL
    // We need to use a type assertion because TypeScript doesn't know about internal properties
    const passportAny = passport as any;
    const googleStrategy = passportAny._strategies?.google;
    
    if (googleStrategy) {
      googleStrategy._callbackURL = dynamicCallbackURL;
    } else {
      console.error('Google strategy not found in passport!');
      
      // If the strategy doesn't exist, let's re-initialize it with the correct URL
      passport.use(
        new GoogleStrategy(
          {
            clientID: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
            callbackURL: dynamicCallbackURL,
            scope: ['profile', 'email']
          },
          // Use the same callback function as before
          async (accessToken, refreshToken, profile, done) => {
            try {
              // Extract profile information
              const email = profile.emails && profile.emails[0] && profile.emails[0].value;
              if (!email) {
                return done(new Error('No email provided from Google'));
              }
              
              // Get profile picture
              const profilePicture = profile.photos && profile.photos[0] && profile.photos[0].value;
              
              // Check if user already exists with this Google ID
              let user = await storage.getUserByGoogleId(profile.id);
              
              // If not found by Google ID, try to find by email (for existing users who want to link Google)
              if (!user) {
                user = await storage.getUserByEmail(email);
                
                if (user) {
                  // Existing user found by email - link Google account to it
                  user = await storage.updateUser(user.id, {
                    googleId: profile.id,
                    profilePicture: profilePicture || user.profilePicture
                  });
                  console.log(`Linked Google account to existing user: ${email}`);
                } else {
                  // No user found - create a new one
                  user = await storage.createUser({
                    name: profile.displayName || email.split('@')[0],
                    email,
                    googleId: profile.id,
                    profilePicture
                  });
                  console.log(`Created new user from Google auth: ${email}`);
                }
              } else {
                // Update user profile with latest Google info
                user = await storage.updateUser(user.id, {
                  profilePicture: profilePicture || user.profilePicture
                });
              }
              
              return done(null, user);
            } catch (error) {
              console.error("Google authentication error:", error);
              return done(error);
            }
          }
        )
      );
    }
    
    passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
  });
  
  // Google OAuth callback route
  app.get('/api/auth/google/callback', (req, res, next) => {
    console.log('Google auth callback route accessed');
    console.log('Callback query:', req.query);
    
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.redirect('/auth?error=google-auth-not-configured');
    }
    
    // Get the same callback URL that we used for the initial request
    let dynamicCallbackURL;
    if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
      dynamicCallbackURL = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/api/auth/google/callback`;
    } else {
      const protocol = req.protocol || 'http';
      const host = req.get('host') || 'localhost:5000';
      dynamicCallbackURL = `${protocol}://${host}/api/auth/google/callback`;
    }
    console.log('Callback URL:', dynamicCallbackURL);
    
    // Update the callback URL in the strategy
    const passportAny = passport as any;
    const googleStrategy = passportAny._strategies?.google;
    if (googleStrategy) {
      googleStrategy._callbackURL = dynamicCallbackURL;
    }
    
    // Handle authentication with a custom callback
    passport.authenticate('google', {
      failureRedirect: '/auth?error=google-auth-failed'
    })(req, res, next);
  }, (req, res) => {
    // This middleware only runs on successful authentication
    console.log('Google authentication successful');
    
    // Check if we have a return URL in the session
    const returnTo = req.session?.returnTo;
    if (returnTo) {
      console.log('Redirecting to saved URL:', returnTo);
      delete req.session.returnTo;
      res.redirect(returnTo);
    } else {
      // Default redirect to home page
      res.redirect('/');
    }
  });
}