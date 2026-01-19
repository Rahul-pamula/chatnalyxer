"""
Rate Limiter for AI API calls
Prevents exceeding 10 calls/minute quota
"""
import time
from collections import deque
from typing import Optional

class AIRateLimiter:
    """
    Limits AI API calls to max_per_minute
    Used to stay within Gemini API quota (10/min free tier)
    """
    
    def __init__(self, max_per_minute: int = 10):
        self.max_per_minute = max_per_minute
        self.call_timestamps = deque(maxlen=max_per_minute)
        self.queued_count = 0
    
    def can_proceed(self) -> bool:
        """
        Check if we can make an AI call now
        Returns True if under limit, False if at limit
        """
        now = time.time()
        
        # If we haven't hit max calls yet, OK
        if len(self.call_timestamps) < self.max_per_minute:
            self.call_timestamps.append(now)
            return True
        
        # Check if oldest call was more than 60 seconds ago
        oldest_timestamp = self.call_timestamps[0]
        time_since_oldest = now - oldest_timestamp
        
        if time_since_oldest > 60:
            # Oldest call was >60s ago, we can make a new call
            self.call_timestamps.append(now)
            return True
        
        # At limit - need to wait
        self.queued_count += 1
        return False
    
    def get_status(self) -> dict:
        """Get current rate limiter status for monitoring"""
        now = time.time()
        
        if len(self.call_timestamps) == 0:
            return {
                'calls_in_last_minute': 0,
                'can_call_now': True,
                'queued': self.queued_count,
                'seconds_until_next_slot': 0
            }
        
        # Count calls in last 60 seconds
        recent_calls = sum(1 for ts in self.call_timestamps if (now - ts) <= 60)
        
        # Time until oldest call expires
        oldest = self.call_timestamps[0]
        seconds_until_slot = max(0, 60 - (now - oldest))
        
        return {
            'calls_in_last_minute': recent_calls,
            'can_call_now': recent_calls < self.max_per_minute,
            'queued': self.queued_count,
            'seconds_until_next_slot': int(seconds_until_slot)
        }
    
    def reset_queue(self):
        """Reset queued counter (call this after processing queue)"""
        self.queued_count = 0

# Global rate limiter instance
ai_rate_limiter = AIRateLimiter(max_per_minute=10)
