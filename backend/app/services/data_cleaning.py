import re
from datetime import datetime
from typing import Dict, List, Any, Tuple, Optional

def normalize_text(text: Optional[str]) -> str:
    """Removes outer whitespaces and double spaces, returns clean text."""
    if not text:
        return ""
    return re.sub(r'\s+', ' ', str(text).strip())

def parse_currency(value: Optional[str]) -> Tuple[float, bool]:
    """
    Parses currency string (e.g., "$10,000.50") to float.
    Returns (cleaned_float, success_flag).
    """
    if value is None:
        return 0.0, False
        
    text = normalize_text(value)
    if not text or text.lower() == "null" or text.lower() == "none" or text == "-":
        return 0.0, False
        
    try:
        # Strip currency symbols, commas, spaces
        cleaned = re.sub(r'[^\d\.\-]', '', text)
        if not cleaned:
            return 0.0, False
        return float(cleaned), True
    except ValueError:
        return 0.0, False

def parse_date(value: Optional[str]) -> Tuple[Optional[str], bool]:
    """
    Attempts to parse date with multiple formats.
    Returns (standardized_date_str_YYYY_MM_DD, success_flag).
    """
    if value is None:
        return None, False
        
    text = normalize_text(value)
    if not text or text.lower() in ["null", "none", "n/a", "undefined"]:
        return None, False

    # Standard formats to try
    formats = [
        "%Y-%m-%d",      # 2026-07-27
        "%d/%m/%Y",      # 27/07/2026
        "%m/%d/%Y",      # 07/27/2026
        "%Y/%m/%d",      # 2026/07/27
        "%d-%m-%Y",      # 27-07-2026
        "%b %d, %Y",     # Jul 27, 2026
        "%B %d, %Y"      # July 27, 2026
    ]
    
    for fmt in formats:
        try:
            dt = datetime.strptime(text, fmt)
            return dt.strftime("%Y-%m-%d"), True
        except ValueError:
            continue
            
    # Try parsing ISO 8601 timestamps using pure python fromisoformat
    try:
        # standard ISO 8601 (e.g., 2026-07-27T10:16:01Z)
        # Replacing Z with +00:00 for python 3.10 and older compatibility
        cleaned_iso = text.replace("Z", "+00:00")
        # Split out time if there's a space or T
        if "T" in cleaned_iso:
            cleaned_iso = cleaned_iso.split("T")[0]
        elif " " in cleaned_iso:
            cleaned_iso = cleaned_iso.split(" ")[0]
            
        dt = datetime.strptime(cleaned_iso, "%Y-%m-%d")
        return dt.strftime("%Y-%m-%d"), True
    except Exception:
        pass
        
    return text, False  # Return original but flag failure

def normalize_customer_name(name: Optional[str]) -> str:
    """
    Cleans customer names to handle duplicates (e.g. 'Google Inc.', 'google' -> 'Google').
    """
    if not name:
        return "Unknown Customer"
        
    text = normalize_text(name)
    if not text or text.lower() in ["null", "none", "unknown", "-"]:
        return "Unknown Customer"
        
    # Standardize common suffixes case insensitively
    # Strip trailing commas/dots before suffixes
    suffix_pattern = r'\b(inc|llc|co|ltd|corp|corporation|gmbh|sa|pvt|pty)\.?\b'
    cleaned = re.sub(suffix_pattern, '', text, flags=re.IGNORECASE)
    
    # Remove any trailing commas, dots, ampersands, or whitespaces left
    cleaned = re.sub(r'[\s,\.&-]+$', '', cleaned)
    cleaned = re.sub(r'^[\s,\.&-]+', '', cleaned)
    
    # Title-case for consistency
    words = cleaned.split()
    if not words:
        return "Unknown Customer"
        
    title_cased = " ".join(w.capitalize() for w in words)
    return title_cased

def map_board_columns(columns: List[Dict[str, Any]], field_patterns: Dict[str, List[str]]) -> Dict[str, str]:
    """
    Maps target logical names (like 'revenue') to actual Monday column IDs
    by searching titles case-insensitively.
    """
    mapped_ids = {}
    
    for field, patterns in field_patterns.items():
        matched_id = None
        # First pass: Look for exact or strong keyword match in column title
        for col in columns:
            title_lower = col.get("title", "").lower()
            col_id = col.get("id", "")
            
            for pattern in patterns:
                if pattern.lower() == title_lower or pattern.lower() in title_lower:
                    matched_id = col_id
                    break
            if matched_id:
                break
                
        # Second pass fallback: Match by column ID directly if it matches the pattern
        if not matched_id:
            for col in columns:
                col_id_lower = col.get("id", "").lower()
                for pattern in patterns:
                    if pattern.lower() == col_id_lower:
                        matched_id = col.get("id")
                        break
                if matched_id:
                    break
                    
        mapped_ids[field] = matched_id or field
        
    return mapped_ids

def get_column_value_text(column_values: List[Dict[str, Any]], column_id: str) -> Optional[str]:
    """Extracts text or raw value from column values for a specific column ID."""
    for val in column_values:
        if val.get("id") == column_id:
            return val.get("text")
    return None

def clean_deals_data(board_data: Dict[str, Any]) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Cleans raw Monday.com Deals board data.
    Returns (cleaned_deals_list, warnings_list).
    """
    columns = board_data.get("columns", [])
    items = board_data.get("items", [])
    warnings = []
    
    # Target fields for Deals board
    deals_patterns = {
        "revenue": ["revenue", "value", "amount", "deal size", "deal value", "contract value"],
        "stage": ["stage", "phase", "deal stage", "status"],
        "close_date": ["close date", "close_date", "closed on", "closed_on", "date"],
        "sector": ["sector", "industry", "vertical"],
        "customer": ["customer", "company", "account", "client", "account name"]
    }
    
    col_map = map_board_columns(columns, deals_patterns)
    cleaned_items = []
    
    for idx, item in enumerate(items):
        item_id = item.get("id", f"index_{idx}")
        item_name = normalize_text(item.get("name", ""))
        col_vals = item.get("column_values", [])
        
        # Skip completely empty rows
        if not item_name and not any(cv.get("text") for cv in col_vals):
            continue
            
        # Get raw texts
        raw_revenue = get_column_value_text(col_vals, col_map["revenue"])
        raw_stage = get_column_value_text(col_vals, col_map["stage"])
        raw_close_date = get_column_value_text(col_vals, col_map["close_date"])
        raw_sector = get_column_value_text(col_vals, col_map["sector"])
        raw_customer = get_column_value_text(col_vals, col_map["customer"])
        
        # 1. Clean Revenue
        revenue, rev_success = parse_currency(raw_revenue)
        if raw_revenue and not rev_success:
            warnings.append(f"Deal '{item_name}' (ID: {item_id}) has malformed currency value: '{raw_revenue}'")
        elif not raw_revenue:
            warnings.append(f"Deal '{item_name}' (ID: {item_id}) is missing deal value/revenue")
            
        # 2. Clean Stage
        stage = normalize_text(raw_stage)
        if not stage or stage.lower() in ["null", "none", "-"]:
            stage = "Unknown"
            warnings.append(f"Deal '{item_name}' (ID: {item_id}) is missing a deal stage")
            
        # 3. Clean Close Date
        close_date, date_success = parse_date(raw_close_date)
        if raw_close_date and not date_success:
            warnings.append(f"Deal '{item_name}' (ID: {item_id}) has malformed close date: '{raw_close_date}'")
            
        # 4. Clean Sector
        sector = normalize_text(raw_sector)
        if not sector or sector.lower() in ["null", "none", "-"]:
            sector = "Unassigned"
            
        # 5. Clean Customer Name
        # If customer column is empty, fallback to item name (often standard in Monday boards)
        customer_source = raw_customer if raw_customer else item_name
        customer = normalize_customer_name(customer_source)
        if not raw_customer and not item_name:
            warnings.append(f"Deal ID: {item_id} has blank name and customer column")

        cleaned_items.append({
            "deal_id": item_id,
            "deal_name": item_name,
            "revenue": revenue,
            "stage": stage,
            "close_date": close_date,
            "sector": sector,
            "customer": customer
        })
        
    return cleaned_items, warnings

def clean_work_orders_data(board_data: Dict[str, Any]) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Cleans raw Monday.com Work Orders board data.
    Returns (cleaned_work_orders_list, warnings_list).
    """
    columns = board_data.get("columns", [])
    items = board_data.get("items", [])
    warnings = []
    
    # Target fields for Work Orders
    work_orders_patterns = {
        "status": ["status", "stage", "state"],
        "due_date": ["due date", "due_date", "deadline", "date", "timeline"],
        "customer": ["customer", "company", "account", "client"],
        "priority": ["priority", "level"]
    }
    
    col_map = map_board_columns(columns, work_orders_patterns)
    cleaned_items = []
    
    for idx, item in enumerate(items):
        item_id = item.get("id", f"index_{idx}")
        item_name = normalize_text(item.get("name", ""))
        col_vals = item.get("column_values", [])
        
        # Skip completely empty rows
        if not item_name and not any(cv.get("text") for cv in col_vals):
            continue
            
        # Get raw texts
        raw_status = get_column_value_text(col_vals, col_map["status"])
        raw_due_date = get_column_value_text(col_vals, col_map["due_date"])
        raw_customer = get_column_value_text(col_vals, col_map["customer"])
        raw_priority = get_column_value_text(col_vals, col_map["priority"])
        
        # 1. Clean Status
        status = normalize_text(raw_status)
        if not status or status.lower() in ["null", "none", "-"]:
            status = "Unknown"
            warnings.append(f"Work Order '{item_name}' (ID: {item_id}) has no status")
            
        # 2. Clean Due Date
        due_date, date_success = parse_date(raw_due_date)
        if raw_due_date and not date_success:
            warnings.append(f"Work Order '{item_name}' (ID: {item_id}) has malformed due date: '{raw_due_date}'")
        elif not raw_due_date:
            warnings.append(f"Work Order '{item_name}' (ID: {item_id}) is missing a due date/deadline")
            
        # 3. Clean Customer
        customer_source = raw_customer if raw_customer else item_name
        customer = normalize_customer_name(customer_source)
        
        # 4. Clean Priority
        priority = normalize_text(raw_priority)
        if not priority or priority.lower() in ["null", "none", "-"]:
            priority = "Normal"  # Default fallback

        cleaned_items.append({
            "work_order_id": item_id,
            "work_order_name": item_name,
            "status": status,
            "due_date": due_date,
            "customer": customer,
            "priority": priority
        })
        
    return cleaned_items, warnings
