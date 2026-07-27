import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.core.config import settings
from app.services.monday_service import MondayService
from app.services.openai_service import OpenAIService
from app.services.data_cleaning import clean_deals_data, clean_work_orders_data

logger = logging.getLogger(__name__)
router = APIRouter()

# --- Request / Response Schemas ---

class ChatMessage(BaseModel):
    role: str = Field(..., description="Role of the sender, either 'user' or 'assistant'")
    content: str = Field(..., description="Message content")

class ChatRequest(BaseModel):
    query: str = Field(..., description="The user prompt or query")
    history: List[ChatMessage] = Field(default_factory=list, description="Previous chat context")

class ChatResponse(BaseModel):
    response: str = Field(..., description="The AI response in markdown")
    warnings: List[str] = Field(..., description="Data cleaning warnings encountered")

class LeadershipSummaryResponse(BaseModel):
    report: str = Field(..., description="The generated leadership report in markdown")
    warnings: List[str] = Field(..., description="Data cleaning warnings encountered")

class ColumnDiagnostic(BaseModel):
    id: str
    title: str
    type: str

class BoardDiagnostic(BaseModel):
    id: str
    name: str
    item_count: int
    columns: List[ColumnDiagnostic]

class BoardsResponse(BaseModel):
    deals_board: BoardDiagnostic
    work_orders_board: BoardDiagnostic
    warnings: List[str]

# --- Route Handlers ---

@router.post("/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest):
    """
    Analyzes Deals and Work Orders boards dynamically, aggregates metrics, and answers
    user queries with conversation history context.
    """
    try:
        # 1. Fetch data from Monday.com
        monday = MondayService()
        raw_deals = monday.fetch_board(settings.DEALS_BOARD_ID)
        raw_wos = monday.fetch_board(settings.WORK_ORDER_BOARD_ID)
        
        # 2. Run data cleaning pipeline
        cleaned_deals, deals_warnings = clean_deals_data(raw_deals)
        cleaned_wos, wos_warnings = clean_work_orders_data(raw_wos)
        
        all_warnings = deals_warnings + wos_warnings
        
        # 3. Format history for OpenAI
        openai_history = [{"role": msg.role, "content": msg.content} for msg in request.history]
        
        # 4. Generate response via OpenAI
        openai_service = OpenAIService()
        ai_response = openai_service.generate_chat_response(
            query=request.query,
            history=openai_history,
            deals_data=cleaned_deals,
            work_orders_data=cleaned_wos,
            warnings=all_warnings
        )
        
        return ChatResponse(response=ai_response, warnings=all_warnings)
        
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Internal chat error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chat Error: {str(e)}"
        )

@router.post("/leadership-summary", response_model=LeadershipSummaryResponse)
def leadership_summary_endpoint():
    """
    Generates a formal, board-ready markdown report detailing
    sales performance, operational metrics, top risks, and recommendation plans.
    """
    try:
        # 1. Fetch data from Monday.com
        monday = MondayService()
        raw_deals = monday.fetch_board(settings.DEALS_BOARD_ID)
        raw_wos = monday.fetch_board(settings.WORK_ORDER_BOARD_ID)
        
        # 2. Run data cleaning pipeline
        cleaned_deals, deals_warnings = clean_deals_data(raw_deals)
        cleaned_wos, wos_warnings = clean_work_orders_data(raw_wos)
        
        all_warnings = deals_warnings + wos_warnings
        
        # 3. Generate structured leadership summary
        openai_service = OpenAIService()
        report = openai_service.generate_leadership_summary(
            deals_data=cleaned_deals,
            work_orders_data=cleaned_wos,
            warnings=all_warnings
        )
        
        return LeadershipSummaryResponse(report=report, warnings=all_warnings)
        
    except Exception as e:
        logger.error(f"Internal leadership report error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Leadership Report Error: {str(e)}"
        )

@router.get("/boards", response_model=BoardsResponse)
def get_boards_diagnostics():
    """
    Diagnostic endpoint that retrieves board configurations, names, and column maps
    to assist setup and monitor data hygiene.
    """
    try:
        monday = MondayService()
        raw_deals = monday.fetch_board(settings.DEALS_BOARD_ID)
        raw_wos = monday.fetch_board(settings.WORK_ORDER_BOARD_ID)
        
        # Pull warnings to expose data health in dashboard
        _, deals_warnings = clean_deals_data(raw_deals)
        _, wos_warnings = clean_work_orders_data(raw_wos)
        
        deals_cols = [
            ColumnDiagnostic(id=c.get("id"), title=c.get("title"), type=c.get("type"))
            for c in raw_deals.get("columns", [])
        ]
        
        wos_cols = [
            ColumnDiagnostic(id=c.get("id"), title=c.get("title"), type=c.get("type"))
            for c in raw_wos.get("columns", [])
        ]
        
        deals_diag = BoardDiagnostic(
            id=raw_deals.get("board_id"),
            name=raw_deals.get("board_name") or "Deals Board",
            item_count=len(raw_deals.get("items", [])),
            columns=deals_cols
        )
        
        wos_diag = BoardDiagnostic(
            id=raw_wos.get("board_id"),
            name=raw_wos.get("board_name") or "Work Orders Board",
            item_count=len(raw_wos.get("items", [])),
            columns=wos_cols
        )
        
        return BoardsResponse(
            deals_board=deals_diag,
            work_orders_board=wos_diag,
            warnings=deals_warnings + wos_warnings
        )
        
    except Exception as e:
        logger.error(f"Diagnostics failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Diagnostics failed: {str(e)}"
        )
