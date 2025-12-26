# Future Enhancement: Real-Time Updates with WebSockets

## Current Implementation (Polling)

**How it works:**
- Mobile app requests new messages every 10 seconds
- Simple but inefficient (battery drain, network usage)

**Code location:**
- `chatnalyxer-mobile/app/dashboard.tsx` (lines 110-120)

```typescript
// Current polling implementation
useEffect(() => {
  fetchData();
  
  // Auto-refresh every 10 seconds
  const interval = setInterval(() => {
    fetchData();
  }, 10000);
  
  return () => clearInterval(interval);
}, []);
```

---

## Proposed Enhancement: WebSocket Implementation

### Benefits
- ✅ **Real-time updates** - Messages appear instantly (< 1 second)
- ✅ **Better battery life** - No constant polling
- ✅ **Reduced server load** - Push updates only when needed
- ✅ **Lower data usage** - No repeated requests

### Architecture

```
┌─────────────────┐         WebSocket          ┌─────────────────┐
│  Mobile App     │ ◄─────────────────────────► │  Backend API    │
│  (React Native) │    Persistent Connection    │  (FastAPI)      │
└─────────────────┘                             └─────────────────┘
                                                        │
                                                        │ Notify
                                                        ▼
                                                ┌─────────────────┐
                                                │  WhatsApp       │
                                                │  Session        │
                                                │  (Node.js)      │
                                                └─────────────────┘
```

---

## Implementation Plan

### Phase 1: Backend WebSocket Server (FastAPI)

**File:** `chatnalyxer-backend/app/websocket.py`

```python
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Set
import json

# Store active connections per user
active_connections: Dict[int, Set[WebSocket]] = {}

async def connect_user(user_id: int, websocket: WebSocket):
    """Connect a user's WebSocket"""
    await websocket.accept()
    if user_id not in active_connections:
        active_connections[user_id] = set()
    active_connections[user_id].add(websocket)

async def disconnect_user(user_id: int, websocket: WebSocket):
    """Disconnect a user's WebSocket"""
    if user_id in active_connections:
        active_connections[user_id].discard(websocket)
        if not active_connections[user_id]:
            del active_connections[user_id]

async def broadcast_to_user(user_id: int, message: dict):
    """Send message to all connections of a specific user"""
    if user_id in active_connections:
        disconnected = set()
        for connection in active_connections[user_id]:
            try:
                await connection.send_json(message)
            except:
                disconnected.add(connection)
        
        # Clean up disconnected sockets
        for conn in disconnected:
            active_connections[user_id].discard(conn)
```

**Add WebSocket endpoint:**

```python
# In app/main.py
from app.websocket import connect_user, disconnect_user

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    await connect_user(user_id, websocket)
    try:
        while True:
            # Keep connection alive
            data = await websocket.receive_text()
            # Handle ping/pong for keepalive
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await disconnect_user(user_id, websocket)
```

---

### Phase 2: Notify on New Message

**File:** `chatnalyxer-backend/app/routers/messages.py`

```python
# After creating a new message (line 197)
from app.websocket import broadcast_to_user

# Inside create_whatsapp_message function
db.add(msg)
db.commit()
db.refresh(msg)

# NEW: Broadcast to user's WebSocket connections
await broadcast_to_user(payload.user_id, {
    "type": "new_message",
    "message": {
        "id": msg.id,
        "content": msg.content,
        "priority_level": msg.priority_level,
        "created_at": msg.created_at.isoformat()
    }
})
```

---

### Phase 3: Mobile App WebSocket Client

**File:** `chatnalyxer-mobile/app/dashboard.tsx`

**Install dependency:**
```bash
npm install react-native-websocket
```

**Implementation:**

```typescript
import { useEffect, useRef } from 'react';

export default function Dashboard() {
  const ws = useRef<WebSocket | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    // Connect to WebSocket
    ws.current = new WebSocket(`wss://your-backend.com/ws/${user.id}`);
    
    ws.current.onopen = () => {
      console.log('✅ WebSocket connected');
    };
    
    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'new_message') {
        // Add new message to state instantly
        setMessages(prev => [data.message, ...prev]);
      }
    };
    
    ws.current.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };
    
    ws.current.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      // Reconnect after 5 seconds
      setTimeout(() => {
        // Reconnect logic
      }, 5000);
    };
    
    // Cleanup on unmount
    return () => {
      ws.current?.close();
    };
  }, [user.id]);

  // Remove polling interval - no longer needed!
  // const interval = setInterval(() => fetchData(), 10000);
  
  return (
    // ... rest of component
  );
}
```

---

## Migration Strategy

### Step 1: Add WebSocket alongside polling
- Keep current polling as fallback
- Add WebSocket for real-time updates
- Test with both systems running

### Step 2: Monitor and optimize
- Track WebSocket connection stability
- Handle reconnection logic
- Add heartbeat/ping-pong for keepalive

### Step 3: Remove polling (optional)
- Once WebSocket is stable, remove polling
- Keep pull-to-refresh for manual updates

---

## Technical Considerations

### Security
- ✅ Authenticate WebSocket connections with JWT token
- ✅ Validate user_id matches token
- ✅ Use WSS (WebSocket Secure) in production

### Scalability
- ⚠️ WebSocket connections are stateful
- ⚠️ Need Redis for multi-server deployments
- ⚠️ Consider using Socket.IO for better fallback support

### Error Handling
- ✅ Auto-reconnect on disconnect
- ✅ Exponential backoff for reconnection
- ✅ Fallback to polling if WebSocket fails

---

## Libraries to Consider

### Backend (Python/FastAPI)
- `fastapi.WebSocket` (built-in) ✅
- `python-socketio` (more features)
- `channels` (Django-style)

### Frontend (React Native)
- Native WebSocket API ✅ (simplest)
- `socket.io-client` (more robust)
- `react-native-websocket` (wrapper)

---

## Timeline Estimate

- **Backend WebSocket setup:** 2-3 hours
- **Message broadcasting:** 1 hour
- **Mobile client integration:** 2-3 hours
- **Testing & debugging:** 2-4 hours
- **Total:** 1-2 days

---

## Priority

**Current Status:** 🟡 Medium Priority

**When to implement:**
- ✅ After core features are stable
- ✅ When user base grows (> 50 active users)
- ✅ When battery/data usage becomes a concern

**For now:**
- Keep 10-second polling for development
- Increase to 30-60 seconds for production
- Implement WebSockets when scaling up

---

## References

- [FastAPI WebSockets](https://fastapi.tiangolo.com/advanced/websockets/)
- [React Native WebSocket](https://reactnative.dev/docs/network#websocket-support)
- [Socket.IO Documentation](https://socket.io/docs/v4/)

---

## Notes

Created: 2025-12-26
Status: Planned
Estimated Effort: Medium
Impact: High (better UX, lower resource usage)
