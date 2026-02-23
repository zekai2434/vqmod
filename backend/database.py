"""
Database configuration and connection
"""
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'network_service_db')

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

async def close_db_connection():
    client.close()
