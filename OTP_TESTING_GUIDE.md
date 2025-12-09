# WhatsApp OTP Authentication - Testing Guide

## ✅ Implementation Complete

The email/password authentication has been successfully replaced with WhatsApp OTP authentication!

## 🚀 Quick Start

### 1. Start All Services
```bash
chmod +x start_all.sh
./start_all.sh
```

This will start:
- **Backend API** on port 8000
- **WhatsApp OTP Service** on port 3001
- **Mobile App** on port 8081

### 2. Link WhatsApp for OTP Service

When you start the services, the WhatsApp OTP service will display a QR code in the terminal. Scan it with WhatsApp to link the service.

**Important**: This is separate from the main WhatsApp integration. This service is specifically for sending OTP messages.

### 3. Test the Login Flow

#### First-Time Registration:
1. Open the mobile app
2. Enter a username (e.g., `testuser`)
3. Enter your phone number (10 digits, without +91)
4. Click "Send OTP"
5. Check your WhatsApp for the OTP message
6. Enter the 6-digit OTP
7. Click "Verify OTP"
8. You should be logged in and redirected to the setup page

#### Subsequent Logins:
1. Enter your phone number
2. Enter any username (it will use the existing account)
3. Click "Send OTP"
4. Enter the OTP from WhatsApp
5. Click "Verify OTP"

## 📋 What Changed

### Backend Changes
- ✅ Updated `User` model with `phone_number`, `is_verified` fields
- ✅ Made `email` and `hashed_password` optional
- ✅ Created `OTP` model for temporary OTP storage
- ✅ Created OTP service with generation, verification, and rate limiting
- ✅ Created WhatsApp service for sending OTP messages
- ✅ New endpoints: `/auth/register-and-request-otp` and `/auth/verify-otp`
- ✅ Removed old email/password endpoints

### Frontend Changes
- ✅ Updated login screen with two-step OTP flow
- ✅ Phone number input with +91 prefix
- ✅ OTP verification screen with countdown timer
- ✅ Resend OTP functionality
- ✅ Updated AuthContext to use `signInWithOTP`
- ✅ Register page now redirects to login

### WhatsApp Integration
- ✅ Created standalone OTP service (`otp-service.js`)
- ✅ Endpoints for sending OTP and general messages
- ✅ Phone number formatting for WhatsApp

## 🧪 Testing Checklist

### Basic Flow
- [ ] Can request OTP with username + phone number
- [ ] Receive OTP on WhatsApp
- [ ] Can verify OTP and login successfully
- [ ] User is created on first OTP verification
- [ ] Existing users can login with just phone number

### Error Handling
- [ ] Invalid phone number shows error
- [ ] Wrong OTP shows error message
- [ ] Expired OTP (after 5 minutes) shows error
- [ ] Rate limiting works (max 3 OTP requests per hour)
- [ ] Duplicate username shows error

### UI/UX
- [ ] Countdown timer shows OTP expiry
- [ ] Resend OTP button works (after 1 minute)
- [ ] Loading states show during API calls
- [ ] Can change phone number before verifying OTP

## 🔧 Configuration

### Backend (.env)
```
DATABASE_URL=postgresql://user:pass@host:port/dbname
OTP_EXPIRY_MINUTES=5
OTP_MAX_ATTEMPTS=3
RATE_LIMIT_REQUESTS=3
RATE_LIMIT_WINDOW_MINUTES=60
```

### WhatsApp OTP Service
- Runs on port 3001
- Uses whatsapp-web.js for sending messages
- Requires QR code scan on first run

## 🐛 Troubleshooting

### OTP not received
- Check if WhatsApp OTP service is running on port 3001
- Verify QR code was scanned
- Check terminal logs for errors
- Ensure phone number format is correct (+91XXXXXXXXXX)

### Database errors
- Run migration: `cd chatnalyxer-backend && python migrate_otp_auth.py`
- Check DATABASE_URL in .env

### Frontend errors
- Clear app cache and restart
- Check if backend is running on port 8000
- Verify API endpoints are accessible

## 📝 API Endpoints

### POST /auth/register-and-request-otp
Request OTP for new or existing user
```json
{
  "username": "testuser",
  "phone_number": "+91XXXXXXXXXX"
}
```

### POST /auth/verify-otp
Verify OTP and login
```json
{
  "phone_number": "+91XXXXXXXXXX",
  "otp_code": "123456"
}
```

## 🎯 Next Steps

1. Test the complete flow end-to-end
2. Verify all error scenarios
3. Test on actual mobile device (not just web)
4. Consider adding SMS fallback if WhatsApp fails
5. Add analytics for OTP success/failure rates

## 📞 Support

If you encounter any issues:
1. Check the terminal logs for all services
2. Verify database migration completed successfully
3. Ensure WhatsApp OTP service is linked (QR scanned)
4. Check that all ports (8000, 3001, 8081) are available
