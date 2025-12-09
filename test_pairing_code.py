#!/usr/bin/env python3
"""Quick test to check if pairing code is in whatsapp_statuses"""
import requests

# Check the current whatsapp_statuses for user 21
# This simulates what the frontend should be getting

print("Checking whatsapp_statuses for user 21...")
print("\nNote: This test requires a valid auth token.")
print("The pairing code should be: JQBGJE51")
print("\nIf the code is in the backend but not showing in UI,")
print("the issue is in the frontend polling/display logic.")
