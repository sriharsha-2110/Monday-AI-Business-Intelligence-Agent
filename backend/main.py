import os
import sys
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Ensure the backend directory is in the system path for clean imports
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.append(backend_dir)

from app.core.config import settings
from app.api.endpoints import router as api_router
from app.services.monday_service import MondayService

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("backend")

# Initialize FastAPI app
app = FastAPI(
    title="Monday.com Business Intelligence Agent API",
    description="FastAPI backend serving OpenAI GPT-powered BI insights on Monday.com board data.",
    version="1.0.0"
)

# Configure CORS Middleware
# Allows frontend services (e.g. Next.js running on Port 3000 or Render Static Sites) to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Set to specific domains in production if required
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register endpoints router
app.include_router(api_router, prefix="/api")

@app.get("/health")
def health_check():
    """
    Health check route validating API reachability, configuration presence,
    and credentials availability.
    """
    monday_ok = False
    openai_ok = bool(settings.OPENAI_API_KEY)
    
    if settings.MONDAY_API_KEY:
        try:
            # Simple query to check Monday connection
            monday = MondayService()
            # Query the user profile (very light complexity query)
            test_query = "query { me { id name } }"
            result = monday._execute_query(test_query)
            if "data" in result and result["data"].get("me"):
                monday_ok = True
        except Exception as e:
            logger.warning(f"Health check: Monday.com connection failed: {e}")
            
    status_str = "healthy" if (monday_ok and openai_ok) else "degraded"
    
    return {
        "status": status_str,
        "monday_connected": monday_ok,
        "openai_connected": openai_ok,
        "environment": {
            "deals_board_configured": bool(settings.DEALS_BOARD_ID),
            "work_orders_board_configured": bool(settings.WORK_ORDER_BOARD_ID)
        }
    }

@app.get("/")
def read_root():
    return {
        "message": "Monday.com BI Agent Backend is running. Access API documentation at /docs"
    }


if __name__ == "__main__":
    import uvicorn
    # Read port from settings (or PORT env set by Render)
    port = int(os.environ.get("PORT", settings.PORT))
    logger.info(f"Starting server on port {port}")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
