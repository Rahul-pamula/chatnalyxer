"""
WhatsApp Service - Send messages via Local OTP Service
"""
import re
import requests
import os
from typing import Optional

# Local OTP Service Configuration
OTP_SERVICE_URL = os.getenv("OTP_SERVICE_URL", "http://localhost:3001")


def format_phone_number(phone_number: str) -> str:
    """
    Format phone number for WhatsApp
    Removes all non-digit characters and ensures proper format
    """
    # Remove all non-digit characters
    digits_only = re.sub(r'\D', '', phone_number)
    
    # Add country code if not present (assuming India +91)
    if not digits_only.startswith('91') and len(digits_only) == 10:
        digits_only = '91' + digits_only
    
    return digits_only


def send_otp_message(phone_number: str, otp_code: str) -> tuple[bool, str]:
    """
    Send OTP via Local OTP Service
    Returns: (success, error_message)
    """
    try:
        # Format phone number
        formatted_number = format_phone_number(phone_number)
        
        # Create OTP message
        message = f"🔐 *Chatnalyxer OTP Verification*\n\nYour OTP code is: *{otp_code}*\n\nThis code will expire in 5 minutes.\nDo not share this code with anyone."
        
        # Local OTP Service endpoint
        url = f"{OTP_SERVICE_URL}/send-otp"
        
        payload = {
            "phone_number": f"{formatted_number}@c.us",
            "message": message
        }
        
        print(f"📤 Sending OTP to {phone_number} via Local OTP Service...")
        
        response = requests.post(
            url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 200:
            print(f"✅ OTP sent successfully to {phone_number}")
            return True, ""
        else:
            error_data = response.json() if response.content else {}
            error_msg = error_data.get('error', 'Failed to send OTP')
            print(f"❌ Failed to send OTP: {error_msg}")
            return False, f"Failed: {error_msg}"
            
    except requests.exceptions.ConnectionError:
        error_msg = "WhatsApp OTP Service is offline. Please run: ./start_whatsapp_otp.sh"
        print(f"❌ {error_msg}")
        return False, error_msg
    except Exception as e:
        error_msg = f"Error sending OTP: {str(e)}"
        print(f"❌ {error_msg}")
        return False, error_msg


def send_welcome_message(phone_number: str, username: str) -> tuple[bool, str]:
    """
    Send welcome message to new user via Local OTP Service
    Returns: (success, error_message)
    """
    try:
        formatted_number = format_phone_number(phone_number)
        
        message = f"👋 *Welcome to Chatnalyxer, {username}!*\n\nYour account has been successfully created. Enjoy using Chatnalyxer! 🚀"
        
        url = f"{OTP_SERVICE_URL}/send-message"
        
        payload = {
            "phone_number": f"{formatted_number}@c.us",
            "message": message
        }
        
        requests.post(
            url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=5
        )
        
        return True, ""
        
    except Exception as e:
        print(f"Failed to send welcome message: {e}")
        return False, str(e)


def check_otp_service_status() -> tuple[bool, str]:
    """
    Check if Local OTP Service is available
    Returns: (is_available, status_message)
    """
    try:
        url = f"{OTP_SERVICE_URL}/health"
        response = requests.get(url, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'ready':
                return True, "WhatsApp OTP Service Ready"
            else:
                return False, "WhatsApp OTP Service Initializing"
        else:
            return False, "WhatsApp OTP Service Offline"
            
    except Exception:
        return False, "WhatsApp OTP Service Offline (Run ./start_whatsapp_otp.sh)"
