# WhatsApp Session Management

## Two Scripts for Different Scenarios

### 1. Normal Restart (Preserves WhatsApp Session) ✅ RECOMMENDED
```bash
cd whatsapp-integration
./start_otp.sh
```

**Use this when:**
- Restarting services normally
- WhatsApp is already linked
- You want to keep the connection

**What it does:**
- Stops the OTP service
- Restarts it WITHOUT deleting session
- WhatsApp stays linked!

---

### 2. Clean Restart (Removes WhatsApp Session)
```bash
cd whatsapp-integration
./clean_and_start_otp.sh
```

**Use this when:**
- WhatsApp connection is broken
- You want to link a different WhatsApp account
- Troubleshooting connection issues

**What it does:**
- Stops the OTP service
- Deletes WhatsApp session files
- Starts fresh (requires re-linking)

---

## Updated Restart Script

The main `restart_all.sh` now uses `start_otp.sh` by default, so:

```bash
./restart_all.sh
```

Will **preserve your WhatsApp session**! 🎉

---

## When to Clean Session

Only use `clean_and_start_otp.sh` if:
- ❌ WhatsApp shows "disconnected" and won't reconnect
- ❌ You see "SingletonLock" errors
- ❌ You want to link a different phone number

Otherwise, always use `start_otp.sh` or `restart_all.sh`!

---

## Quick Commands

```bash
# Normal restart (keeps WhatsApp linked)
./restart_all.sh

# Just restart WhatsApp service (keeps session)
cd whatsapp-integration
./start_otp.sh

# Fresh start (requires re-linking)
cd whatsapp-integration
./clean_and_start_otp.sh
```

---

**Now you won't need to re-link WhatsApp every time!** 🚀
