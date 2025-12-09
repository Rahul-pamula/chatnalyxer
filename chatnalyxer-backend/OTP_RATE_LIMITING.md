# OTP Rate Limiting Configuration

## Testing Mode (Current - Lenient Limits)

The OTP service is now configured for **testing mode** with very lenient rate limits:

- **Requests allowed**: 100 OTPs per hour (per phone number)
- **Time window**: 60 minutes

This allows you to test extensively without hitting rate limits.

## Configuration

The rate limiting is controlled by environment variables in `.env`:

```bash
# Testing mode (current)
OTP_RATE_LIMIT_REQUESTS=100
OTP_RATE_LIMIT_WINDOW_MINUTES=60
```

## Production Mode (Recommended for Deployment)

When deploying to production, update your `.env` file:

```bash
# Production mode (strict limits to prevent abuse)
OTP_RATE_LIMIT_REQUESTS=3
OTP_RATE_LIMIT_WINDOW_MINUTES=60
```

This limits users to 3 OTP requests per hour, preventing spam and abuse.

## How to Change

### Option 1: Use Environment Variables (Recommended)
Add to your `.env` file in `chatnalyxer-backend/`:
```bash
OTP_RATE_LIMIT_REQUESTS=100  # Number of OTPs allowed
OTP_RATE_LIMIT_WINDOW_MINUTES=60  # Time window in minutes
```

### Option 2: Set in Terminal (Temporary)
```bash
export OTP_RATE_LIMIT_REQUESTS=100
export OTP_RATE_LIMIT_WINDOW_MINUTES=60
uvicorn app.main:app --host 0.0.0.0 --reload
```

## Current Status

✅ **Testing mode is active** - You can now request up to 100 OTPs per hour without hitting the rate limit!

The backend will auto-reload with the new settings.
