import logging
import time
import httpx
from typing import Dict, List, Any, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

MONDAY_API_URL = "https://api.monday.com/v2"

class MondayService:
    def __init__(self, api_key: str = settings.MONDAY_API_KEY):
        self.api_key = api_key
        self.headers = {
            "Authorization": self.api_key,
            "Content-Type": "application/json",
            "API-Version": "2024-01"  # Target stable API version
        }
        self.client = httpx.Client(headers=self.headers, timeout=30.0)

    def _execute_query(self, query: str, variables: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Execute GraphQL query with exponential backoff for rate limits and connection retries.
        """
        retries = 3
        backoff = 1.0
        
        for attempt in range(retries):
            try:
                payload = {"query": query}
                if variables:
                    payload["variables"] = variables
                
                response = self.client.post(MONDAY_API_URL, json=payload)
                
                # Check for HTTP 429 (Too Many Requests) or general client/server issues
                if response.status_code == 429:
                    logger.warning(f"Monday API Rate limit hit. Retrying in {backoff}s... (Attempt {attempt+1}/{retries})")
                    time.sleep(backoff)
                    backoff *= 2
                    continue
                    
                response.raise_for_status()
                result = response.json()
                
                # Check for GraphQL errors in payload
                if "errors" in result:
                    errors = result["errors"]
                    logger.error(f"GraphQL Errors: {errors}")
                    # If it's a complexity budget error, we back off and try again
                    if any("complexity" in err.get("message", "").lower() for err in errors):
                        logger.warning(f"Complexity budget error. Retrying in {backoff}s...")
                        time.sleep(backoff)
                        backoff *= 2
                        continue
                    raise Exception(f"Monday GraphQL Error: {errors[0].get('message')}")
                
                return result
                
            except httpx.HTTPStatusError as e:
                logger.error(f"HTTP error occurred: {e.response.text}")
                if attempt == retries - 1:
                    raise Exception(f"HTTP Error querying monday.com: {e.response.status_code} - {e.response.text}")
                time.sleep(backoff)
                backoff *= 2
            except httpx.RequestError as e:
                logger.error(f"Network error occurred: {e}")
                if attempt == retries - 1:
                    raise Exception(f"Network Connection Error: Could not connect to monday.com API ({e})")
                time.sleep(backoff)
                backoff *= 2

        raise Exception("Failed to query Monday.com API after maximum retries.")

    def fetch_board(self, board_id: str) -> Dict[str, Any]:
        """
        Fetches board columns and paginated items for a given board ID.
        """
        # Validate board ID format
        if not board_id or not board_id.strip().isdigit():
            raise ValueError(f"Invalid Monday Board ID format: '{board_id}'. Board IDs should be numeric strings.")

        # Query columns and first page of items
        initial_query = """
        query ($boardId: [ID!], $limit: Int!) {
          boards(ids: $boardId) {
            id
            name
            columns {
              id
              title
              type
            }
            items_page(limit: $limit) {
              cursor
              items {
                id
                name
                column_values {
                  id
                  text
                  value
                  type
                }
              }
            }
          }
        }
        """
        
        variables = {
            "boardId": [board_id],
            "limit": 100
        }
        
        logger.info(f"Fetching initial page for board {board_id}")
        data = self._execute_query(initial_query, variables)
        
        boards = data.get("data", {}).get("boards", [])
        if not boards:
            raise Exception(f"No board found with ID: {board_id}. Ensure the ID is correct and your API key has permission to view it.")
            
        board = boards[0]
        columns = board.get("columns", [])
        items_page = board.get("items_page", {})
        items = items_page.get("items", [])
        cursor = items_page.get("cursor")
        
        # Paginate to fetch all remaining items
        page_count = 1
        while cursor:
            logger.info(f"Fetching page {page_count + 1} for board {board_id}")
            next_page_query = """
            query ($cursor: String!) {
              next_items_page(cursor: $cursor) {
                cursor
                items {
                  id
                  name
                  column_values {
                    id
                    text
                    value
                    type
                  }
                }
              }
            }
            """
            next_variables = {"cursor": cursor}
            next_data = self._execute_query(next_page_query, next_variables)
            
            next_page = next_data.get("data", {}).get("next_items_page", {})
            next_items = next_page.get("items", [])
            items.extend(next_items)
            cursor = next_page.get("cursor")
            page_count += 1
            
            # Guard against infinite pagination loops
            if page_count > 100:
                logger.warning(f"Pagination limit reached (10,000 items) for board {board_id}")
                break

        logger.info(f"Completed fetching board {board_id}. Total items fetched: {len(items)}")
        
        return {
            "board_id": board_id,
            "board_name": board.get("name"),
            "columns": columns,
            "items": items
        }
