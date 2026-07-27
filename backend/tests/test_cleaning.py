import pytest
from app.services.data_cleaning import (
    normalize_text,
    parse_currency,
    parse_date,
    normalize_customer_name,
    clean_deals_data,
    clean_work_orders_data
)

def test_normalize_text():
    assert normalize_text("   hello    world   ") == "hello world"
    assert normalize_text("  hello\nworld  ") == "hello world"
    assert normalize_text(None) == ""
    assert normalize_text("") == ""

def test_parse_currency():
    val, success = parse_currency("$1,500.50")
    assert val == 1500.50
    assert success is True

    val, success = parse_currency("€ 350.00")
    assert val == 350.00
    assert success is True

    val, success = parse_currency("10,000")
    assert val == 10000.0
    assert success is True

    val, success = parse_currency("-")
    assert val == 0.0
    assert success is False

    val, success = parse_currency("null")
    assert val == 0.0
    assert success is False

    val, success = parse_currency(None)
    assert val == 0.0
    assert success is False

def test_parse_date():
    # ISO Standard
    val, success = parse_date("2026-07-27")
    assert val == "2026-07-27"
    assert success is True

    # British/European Slash
    val, success = parse_date("27/07/2026")
    assert val == "2026-07-27"
    assert success is True

    # US Slash
    val, success = parse_date("07/27/2026")
    assert val == "2026-07-27"
    assert success is True

    # Month string
    val, success = parse_date("Jul 27, 2026")
    assert val == "2026-07-27"
    assert success is True

    # Invalid dates
    val, success = parse_date("invalid date")
    assert val == "invalid date"
    assert success is False

    val, success = parse_date(None)
    assert val is None
    assert success is False

def test_normalize_customer_name():
    assert normalize_customer_name("Google Inc.") == "Google"
    assert normalize_customer_name("google llc") == "Google"
    assert normalize_customer_name("Acme Corporation") == "Acme"
    assert normalize_customer_name("  microsoft  ") == "Microsoft"
    assert normalize_customer_name("Alpha Gmbh & Co") == "Alpha"
    assert normalize_customer_name(None) == "Unknown Customer"
    assert normalize_customer_name("-") == "Unknown Customer"

def test_clean_deals_data():
    mock_board = {
        "columns": [
            {"id": "name", "title": "Name", "type": "text"},
            {"id": "numbers", "title": "Revenue", "type": "numeric"},
            {"id": "status", "title": "Stage", "type": "status"},
            {"id": "date", "title": "Close Date", "type": "date"},
            {"id": "text", "title": "Sector", "type": "text"},
            {"id": "text2", "title": "Customer", "type": "text"}
        ],
        "items": [
            {
                "id": "1",
                "name": "Acme Deal",
                "column_values": [
                    {"id": "numbers", "text": "$5,000.00"},
                    {"id": "status", "text": "Won"},
                    {"id": "date", "text": "27/07/2026"},
                    {"id": "text", "text": "Energy"},
                    {"id": "text2", "text": "Acme Inc."}
                ]
            },
            {
                "id": "2",
                "name": "Stalled Deal",
                "column_values": [
                    {"id": "numbers", "text": "invalid_val"},
                    {"id": "status", "text": ""},
                    {"id": "date", "text": "invalid_date"},
                    {"id": "text", "text": ""},
                    {"id": "text2", "text": ""}
                ]
            }
        ]
    }

    cleaned, warnings = clean_deals_data(mock_board)
    
    assert len(cleaned) == 2
    assert cleaned[0]["customer"] == "Acme"
    assert cleaned[0]["revenue"] == 5000.0
    assert cleaned[0]["stage"] == "Won"
    assert cleaned[0]["close_date"] == "2026-07-27"
    assert cleaned[0]["sector"] == "Energy"

    # Warnings for row 2
    assert any("malformed currency" in w for w in warnings)
    assert any("missing a deal stage" in w for w in warnings)
    assert any("malformed close date" in w for w in warnings)

def test_clean_work_orders_data():
    mock_board = {
        "columns": [
            {"id": "name", "title": "Work Order Name", "type": "text"},
            {"id": "status", "title": "Status", "type": "status"},
            {"id": "date", "title": "Due Date", "type": "date"},
            {"id": "text", "title": "Customer", "type": "text"}
        ],
        "items": [
            {
                "id": "10",
                "name": "Installation",
                "column_values": [
                    {"id": "status", "text": "Working on it"},
                    {"id": "date", "text": "2026-08-15"},
                    {"id": "text", "text": "Google Inc."}
                ]
            }
        ]
    }

    cleaned, warnings = clean_work_orders_data(mock_board)
    assert len(cleaned) == 1
    assert cleaned[0]["customer"] == "Google"
    assert cleaned[0]["status"] == "Working on it"
    assert cleaned[0]["due_date"] == "2026-08-15"
