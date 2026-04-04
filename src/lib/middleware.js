import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

export const createClient = (request: NextRequest) => {
    // Create an unmodified response
    let supabaseResponse = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        supabaseUrl!,
        supabaseKey!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        },
    );

    return supabaseResponse
};

//'use strict';

///**
// * Request logger middleware.
// * Logs method, url, status and duration to console.
// */
//function requestLogger(req, res, next) {
//  const start = process.hrtime.bigint();
//  const { method, originalUrl } = req;

//  res.on('finish', () => {
//    const end = process.hrtime.bigint();
//    const durationMs = Number(end - start) / 1_000_000;
//    const { statusCode } = res;
//    console.log(
//      `[${new Date().toISOString()}] ${method} ${originalUrl} ${statusCode} - ${durationMs.toFixed(
//        2
//      )} ms`
//    );
//  });

//  next();
//}

///**
// * Wrap async route handlers to forward errors to Express error handler.
// * Usage: router.get('/', asyncHandler(async (req, res) => { ... }));
// */
//function asyncHandler(fn) {
//  return function asyncWrapped(req, res, next) {
//    Promise.resolve(fn(req, res, next)).catch(next);
//  };
//}

///**
// * 404 Not Found middleware.
// * Should be mounted after all routes.
// */
//function notFound(req, res, next) {
//  res.status(404).json({
//    error: 'Not Found',
//    path: req.originalUrl,
//  });
//}

///**
// * Centralized error handler for Express.
// * Sends minimal information in production and more details in development.
// */
//function errorHandler(err, req, res, next) {
//  // Preserve any existing headers and status if provided by upstream errors
//  const status = err.status || err.statusCode || 500;
//  const isProd = process.env.NODE_ENV === 'production';

//  // Log full error server-side for diagnostics
//  if (status >= 500) {
//    console.error(err);
//  } else {
//    console.warn(err.message || err);
//  }

//  res.status(status).json({
//    error: {
//      message: err.message || 'Internal Server Error',
//      // Only include stack/details when not in production
//      ...(isProd ? {} : { stack: err.stack }),
//    },
//  });
//}

///**
// * Simple authentication middleware.
// * - If `req.user` is already populated (previous auth middleware), allow.
// * - Otherwise checks for `Authorization: Bearer <token>` header and fails if absent.
// * This is intentionally minimal; replace token validation with your auth logic.
// */
//function requireAuth(req, res, next) {
//  if (req.user) {
//    return next();
//  }

//  const auth = req.headers && req.headers.authorization;
//  if (!auth || !auth.startsWith('Bearer ')) {
//    return res.status(401).json({ error: 'Unauthorized' });
//  }

//  // Placeholder: attach token to request for downstream validation
//  const token = auth.slice(7).trim();
//  req.token = token;

//  // Real token validation should happen here (e.g., JWT verify) or in another middleware.
//  next();
//}

//module.exports = {
//  requestLogger,
//  asyncHandler,
//  notFound,
//  errorHandler,
//  requireAuth,
//};