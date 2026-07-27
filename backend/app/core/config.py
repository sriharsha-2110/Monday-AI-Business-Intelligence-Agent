import os
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    # API Keys with fallback defaults for local developer/test startup
    MONDAY_API_KEY: str = "placeholder_monday_key"
    OPENAI_API_KEY: str = "placeholder_openai_key"
    
    # Monday.com Board IDs
    WORK_ORDER_BOARD_ID: str = "placeholder_work_order_board"
    DEALS_BOARD_ID: str = "placeholder_deals_board"
    
    # Server configuration
    PORT: int = 8000

    class Config:
        # Resolve the root .env file relative to this file
        env_file = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), 
            ".env"
        )
        env_file_encoding = "utf-8"
        extra = "ignore"

# Instantiate settings
settings = Settings()
