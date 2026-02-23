"""
Application configuration
"""
import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.environ.get('JWT_SECRET', 'network-service-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

# Email settings
RESEND_API_KEY = os.environ.get('RESEND_API_KEY')

# SMS settings  
NETGSM_USERNAME = os.environ.get('NETGSM_USERNAME')
NETGSM_PASSWORD = os.environ.get('NETGSM_PASSWORD')
NETGSM_HEADER = os.environ.get('NETGSM_HEADER')
