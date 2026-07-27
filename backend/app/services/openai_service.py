import logging
import json
from typing import List, Dict, Any, Optional
from openai import OpenAI
from app.core.config import settings
from app.prompts.bi_prompts import FOUNDER_BI_SYSTEM_PROMPT, LEADERSHIP_SUMMARY_SYSTEM_PROMPT

logger = logging.getLogger(__name__)

class OpenAIService:
    def __init__(self, api_key: str = settings.OPENAI_API_KEY):
        self.api_key = api_key
        self.client = OpenAI(api_key=self.api_key)

    def calculate_business_metrics(self, deals: List[Dict[str, Any]], work_orders: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Pre-calculates exact metrics from cleaned data to ensure mathematical accuracy
        before presenting it to the LLM.
        """
        # --- Deals Metrics ---
        total_deals = len(deals)
        total_pipeline_val = sum(d.get("revenue", 0.0) for d in deals)
        
        # Categorize stages case-insensitively
        won_deals = []
        lost_deals = []
        open_deals = []
        
        stage_dist = {}
        sector_dist = {}
        customer_deals = {}
        
        for d in deals:
            stage = d.get("stage", "Unknown")
            stage_lower = stage.lower()
            rev = d.get("revenue", 0.0)
            sector = d.get("sector", "Unassigned")
            cust = d.get("customer", "Unknown Customer")
            
            stage_dist[stage] = stage_dist.get(stage, 0) + 1
            sector_dist[sector] = sector_dist.get(sector, 0.0) + rev
            customer_deals[cust] = customer_deals.get(cust, 0.0) + rev
            
            if "won" in stage_lower or stage_lower == "done" or stage_lower == "completed":
                won_deals.append(d)
            elif "lost" in stage_lower:
                lost_deals.append(d)
            else:
                open_deals.append(d)
                
        won_val = sum(d.get("revenue", 0.0) for d in won_deals)
        lost_val = sum(d.get("revenue", 0.0) for d in lost_deals)
        open_val = sum(d.get("revenue", 0.0) for d in open_deals)
        
        # Financial Ratios
        win_rate_value = (won_val / (won_val + lost_val) * 100) if (won_val + lost_val) > 0 else 0.0
        win_rate_count = (len(won_deals) / (len(won_deals) + len(lost_deals)) * 100) if (len(won_deals) + len(lost_deals)) > 0 else 0.0
        avg_deal_size = (total_pipeline_val / total_deals) if total_deals > 0 else 0.0
        
        # Sort collections
        top_customers = sorted(customer_deals.items(), key=lambda x: x[1], reverse=True)[:5]
        
        # --- Work Orders Metrics ---
        total_wos = len(work_orders)
        
        wo_status_dist = {}
        wo_priority_dist = {}
        wo_customer_dist = {}
        
        completed_wos = []
        delayed_stuck_wos = []
        active_wos = []
        
        for w in work_orders:
            status = w.get("status", "Unknown")
            status_lower = status.lower()
            priority = w.get("priority", "Normal")
            cust = w.get("customer", "Unknown Customer")
            
            wo_status_dist[status] = wo_status_dist.get(status, 0) + 1
            wo_priority_dist[priority] = wo_priority_dist.get(priority, 0) + 1
            wo_customer_dist[cust] = wo_customer_dist.get(cust, 0) + 1
            
            if status_lower in ["done", "completed", "complete", "closed"]:
                completed_wos.append(w)
            elif status_lower in ["delayed", "stuck", "blocked", "late"]:
                delayed_stuck_wos.append(w)
            else:
                active_wos.append(w)
                
        completion_rate = (len(completed_wos) / total_wos * 100) if total_wos > 0 else 0.0
        
        # Cross-board correlations: check if high-value customers have delayed work orders
        cross_board_alerts = []
        for cust, deal_val in top_customers:
            cust_delayed = [w for w in delayed_stuck_wos if w.get("customer") == cust]
            if cust_delayed:
                cross_board_alerts.append({
                    "customer": cust,
                    "deals_value": deal_val,
                    "delayed_work_orders_count": len(cust_delayed),
                    "work_orders": [w.get("work_order_name") for w in cust_delayed]
                })

        return {
            "deals": {
                "total_count": total_deals,
                "total_pipeline_value": total_pipeline_val,
                "closed_won_value": won_val,
                "closed_won_count": len(won_deals),
                "closed_lost_value": lost_val,
                "closed_lost_count": len(lost_deals),
                "open_value": open_val,
                "open_count": len(open_deals),
                "average_deal_size": avg_deal_size,
                "win_rate_value": win_rate_value,
                "win_rate_count": win_rate_count,
                "stage_distribution": stage_dist,
                "sector_performance": sector_dist,
                "top_5_customers": dict(top_customers)
            },
            "work_orders": {
                "total_count": total_wos,
                "completed_count": len(completed_wos),
                "delayed_stuck_count": len(delayed_stuck_wos),
                "active_count": len(active_wos),
                "completion_rate": completion_rate,
                "status_distribution": wo_status_dist,
                "priority_distribution": wo_priority_dist,
                "customer_work_orders": dict(sorted(wo_customer_dist.items(), key=lambda x: x[1], reverse=True)[:5])
            },
            "cross_board_alerts": cross_board_alerts
        }

    def generate_chat_response(
        self, 
        query: str, 
        history: List[Dict[str, str]], 
        deals_data: List[Dict[str, Any]], 
        work_orders_data: List[Dict[str, Any]], 
        warnings: List[str]
    ) -> str:
        """
        Generates founder-focused response based on real-time board data and history.
        """
        metrics = self.calculate_business_metrics(deals_data, work_orders_data)
        
        # Build context
        context = {
            "precalculated_metrics": metrics,
            "data_cleaning_warnings": warnings,
            "raw_deals_subset": deals_data[:100],  # safety cap for token size
            "raw_work_orders_subset": work_orders_data[:100]
        }
        
        # Prepare messages
        messages = [
            {"role": "system", "content": FOUNDER_BI_SYSTEM_PROMPT},
        ]
        
        # Append history
        for msg in history:
            messages.append({"role": msg["role"], "content": msg["content"]})
            
        # Append current query with board context
        user_message_content = f"""
Here is the real-time board data context:
{json.dumps(context, indent=2)}

User Question: {query}
"""
        messages.append({"role": "user", "content": user_message_content})
        
        try:
            logger.info("Calling OpenAI chat completion for /chat endpoint")
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                temperature=0.2  # low temperature for stable analytical outputs
            )
            return response.choices[0].message.content or "No response from AI assistant."
        except Exception as e:
            logger.error(f"OpenAI completion error: {e}")
            raise Exception(f"AI Assistant Error: Failed to generate response ({str(e)})")

    def generate_leadership_summary(
        self, 
        deals_data: List[Dict[str, Any]], 
        work_orders_data: List[Dict[str, Any]], 
        warnings: List[str]
    ) -> str:
        """
        Generates the formal board-ready Leadership Update.
        """
        metrics = self.calculate_business_metrics(deals_data, work_orders_data)
        
        context = {
            "precalculated_metrics": metrics,
            "data_cleaning_warnings": warnings,
            "raw_deals": deals_data,
            "raw_work_orders": work_orders_data
        }
        
        messages = [
            {"role": "system", "content": LEADERSHIP_SUMMARY_SYSTEM_PROMPT},
            {
                "role": "user", 
                "content": f"Generate the board leadership update using this datasets:\n{json.dumps(context, indent=2)}"
            }
        ]
        
        try:
            logger.info("Calling OpenAI chat completion for /leadership-summary")
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                temperature=0.3
            )
            return response.choices[0].message.content or "Failed to generate leadership summary."
        except Exception as e:
            logger.error(f"OpenAI leadership summary completion error: {e}")
            raise Exception(f"AI Assistant Error: Failed to generate leadership summary ({str(e)})")
