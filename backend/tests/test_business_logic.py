import pytest
from app.services.openai_service import OpenAIService

def test_calculate_business_metrics():
    # Instantiate the service (API key isn't used for internal metric math function)
    service = OpenAIService(api_key="mock_key")
    
    mock_deals = [
        {"deal_id": "1", "deal_name": "Deal A", "revenue": 10000.0, "stage": "Won", "sector": "Energy", "customer": "Tesla"},
        {"deal_id": "2", "deal_name": "Deal B", "revenue": 20000.0, "stage": "Won", "sector": "Energy", "customer": "Tesla"},
        {"deal_id": "3", "deal_name": "Deal C", "revenue": 15000.0, "stage": "Lost", "sector": "Tech", "customer": "Google"},
        {"deal_id": "4", "deal_name": "Deal D", "revenue": 50000.0, "stage": "Proposal", "sector": "Tech", "customer": "Google"},
    ]
    
    mock_work_orders = [
        {"work_order_id": "10", "work_order_name": "WO A", "status": "Done", "customer": "Tesla", "priority": "High"},
        {"work_order_id": "11", "work_order_name": "WO B", "status": "Delayed", "customer": "Tesla", "priority": "High"},
        {"work_order_id": "12", "work_order_name": "WO C", "status": "Stuck", "customer": "Google", "priority": "Medium"},
    ]
    
    metrics = service.calculate_business_metrics(mock_deals, mock_work_orders)
    
    # 1. Deals checks
    deals_metrics = metrics["deals"]
    assert deals_metrics["total_count"] == 4
    assert deals_metrics["total_pipeline_value"] == 95000.0
    assert deals_metrics["closed_won_value"] == 30000.0
    assert deals_metrics["closed_lost_value"] == 15000.0
    assert deals_metrics["open_value"] == 50000.0
    assert deals_metrics["average_deal_size"] == 23750.0
    
    # Value-based Win Rate: Won / (Won + Lost) = 30000 / (30000 + 15000) = 66.67%
    assert round(deals_metrics["win_rate_value"], 2) == 66.67
    
    # Count-based Win Rate: Won count / (Won + Lost) count = 2 / (2 + 1) = 66.67%
    assert round(deals_metrics["win_rate_count"], 2) == 66.67
    
    # Sector distributions
    assert deals_metrics["sector_performance"]["Energy"] == 30000.0
    assert deals_metrics["sector_performance"]["Tech"] == 65000.0
    
    # 2. Work Order checks
    wo_metrics = metrics["work_orders"]
    assert wo_metrics["total_count"] == 3
    assert wo_metrics["completed_count"] == 1
    assert wo_metrics["delayed_stuck_count"] == 2
    assert wo_metrics["completion_rate"] == (1/3)*100
    
    # 3. Cross board alerts (e.g. Top customer Tesla has a delayed work order)
    alerts = metrics["cross_board_alerts"]
    assert len(alerts) > 0
    # Tesla should be in the alert list because it is the top customer ($30,000.0 value) and has WO B delayed
    tesla_alert = next((a for a in alerts if a["customer"] == "Tesla"), None)
    assert tesla_alert is not None
    assert tesla_alert["delayed_work_orders_count"] == 1
    assert "WO B" in tesla_alert["work_orders"]
