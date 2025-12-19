"""
Email Service for Chatnalyxer
Handles IMAP connection, email fetching, and parsing.
"""

import imaplib
import email
from email.header import decode_header
import logging
from datetime import datetime
from typing import List, Dict, Optional
import re

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        # Mapping of common domains to IMAP servers
        self.imap_servers = {
            'gmail.com': 'imap.gmail.com',
            'outlook.com': 'outlook.office365.com',
            'hotmail.com': 'outlook.office365.com',
            'yahoo.com': 'imap.mail.yahoo.com'
        }

    def connect_and_fetch(self, email_addr: str, password: str, limit: int = 10) -> List[Dict]:
        """
        Connect to IMAP server and fetch recent emails.
        For Gmail, 'password' must be an App Password.
        """
        domain = email_addr.split('@')[-1]
        imap_server = self.imap_servers.get(domain)
        
        if not imap_server:
            # Fallback or error
            logger.warning(f"Unknown domain {domain}, defaulting to gmail for trial")
            imap_server = 'imap.gmail.com'

        try:
            # Connect to IMAP
            mail = imaplib.IMAP4_SSL(imap_server)
            mail.login(email_addr, password)
            mail.select("inbox")

            # Search for recent emails (last 3 days or just ALL)
            # For simplicity in MVP, fetch last 'limit' messages
            _, search_data = mail.search(None, "ALL")
            mail_ids = search_data[0].split()
            
            # Get latest
            latest_email_ids = mail_ids[-limit:]
            
            emails_data = []

            for i in latest_email_ids:
                try:
                    _, msg_data = mail.fetch(i, "(RFC822)")
                    for response_part in msg_data:
                        if isinstance(response_part, tuple):
                            msg = email.message_from_bytes(response_part[1])
                            
                            # Decode subject
                            subject, encoding = decode_header(msg["Subject"])[0]
                            if isinstance(subject, bytes):
                                subject = subject.decode(encoding if encoding else "utf-8")
                            
                            # Get sender
                            from_ = msg.get("From")
                            
                            # Get body
                            body = self._get_email_body(msg)
                            
                            # Get date
                            date_str = msg.get("Date")
                            # Simple parsing - in production use dateutil
                            
                            emails_data.append({
                                "id": i.decode(),
                                "subject": subject,
                                "sender": from_,
                                "body": body,
                                "raw_date": date_str,
                                "source": "email"
                            })
                except Exception as e:
                    logger.error(f"Error parsing email {i}: {e}")
                    continue

            mail.close()
            mail.logout()
            return emails_data

        except Exception as e:
            logger.error(f"IMAP Connection failed: {e}")
            raise e

    def _get_email_body(self, msg) -> str:
        if msg.is_multipart():
            for part in msg.walk():
                content_type = part.get_content_type()
                content_disposition = str(part.get("Content-Disposition"))

                if "attachment" not in content_disposition:
                    if content_type == "text/plain":
                        return part.get_payload(decode=True).decode()
                    elif content_type == "text/html":
                         # Strip HTML for MVP analysis
                         html = part.get_payload(decode=True).decode()
                         return self._strip_html(html)
        else:
             content_type = msg.get_content_type()
             if content_type == "text/plain":
                return msg.get_payload(decode=True).decode()
             elif content_type == "text/html":
                return self._strip_html(msg.get_payload(decode=True).decode())
        
        return ""

    def _strip_html(self, html_content: str) -> str:
        # Very basic regex strip for MVP
        clean = re.compile('<.*?>')
        return re.sub(clean, '', html_content)

email_service = EmailService()
