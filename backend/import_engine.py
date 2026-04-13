"""
Import engine for bank statement parsing (CSV, Excel, PDF).
Auto-categorizes transactions based on keyword matching.
"""
import io
import re
from datetime import datetime
from typing import List, Optional
import pandas as pd
from sqlalchemy.orm import Session
from models import Category, CategoryRule, Transaction, TransactionType, Currency


# Common date formats found in German & international bank statements
DATE_FORMATS = [
    "%d.%m.%Y",   # 13.04.2026
    "%Y-%m-%d",    # 2026-04-13
    "%d/%m/%Y",    # 13/04/2026
    "%m/%d/%Y",    # 04/13/2026
    "%d-%m-%Y",    # 13-04-2026
    "%d.%m.%y",    # 13.04.26
]

# Column name mappings (German + English bank exports)
COLUMN_MAPPINGS = {
    "date": ["datum", "date", "buchungstag", "booking date", "valuta", "wertstellung", "transaction date",
             "startdatum", "started date", "abschlussdatum", "completed date"],
    "amount": ["betrag", "amount", "umsatz", "value", "sum", "summe"],
    "description": ["verwendungszweck", "description", "beschreibung", "buchungstext", "text", "details",
                     "reference", "zahlungsempfänger", "empfänger", "auftraggeber", "beneficiary", "remittance",
                     "produkt", "product"],
    "counterparty": ["empfänger", "auftraggeber", "beneficiary", "payee", "payer", "name", "beguenstigter"],
    "type": ["typ", "type", "soll/haben", "debit/credit", "buchungsart"],
    "currency": ["währung", "currency", "ccy"],
}


def find_column(df: pd.DataFrame, target: str) -> Optional[str]:
    """Find the best matching column name."""
    candidates = COLUMN_MAPPINGS.get(target, [])
    cols_lower = {c.lower().strip(): c for c in df.columns}

    for candidate in candidates:
        if candidate in cols_lower:
            return cols_lower[candidate]

    # Fuzzy: check if any candidate is contained in column name or vice versa
    for candidate in candidates:
        for col_lower, col_orig in cols_lower.items():
            if candidate in col_lower or col_lower in candidate:
                return col_orig

    return None


def parse_date(date_str: str) -> Optional[datetime]:
    """Try multiple date formats."""
    if pd.isna(date_str):
        return None
    date_str = str(date_str).strip()
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    # Try pandas parser as fallback
    try:
        return pd.to_datetime(date_str).to_pydatetime()
    except:
        return None


def parse_amount(amount_str) -> Optional[float]:
    """Parse amount handling German format (1.234,56) and standard (1,234.56)."""
    if pd.isna(amount_str):
        return None
    s = str(amount_str).strip()

    # Remove currency symbols
    s = re.sub(r'[€$£]', '', s).strip()

    # German format: 1.234,56 → detect by comma before last 2-3 digits
    if re.match(r'^-?\d{1,3}(\.\d{3})*(,\d{1,2})?$', s):
        s = s.replace('.', '').replace(',', '.')
    elif ',' in s and '.' not in s:
        s = s.replace(',', '.')
    elif ',' in s and '.' in s:
        # If comma comes after dot: German format
        if s.rfind(',') > s.rfind('.'):
            s = s.replace('.', '').replace(',', '.')

    try:
        return float(s)
    except ValueError:
        return None


def auto_categorize(description: str, counterparty: str, categories: List[Category], rules: List = None) -> Optional[int]:
    """Match transaction against rules first, then category keywords."""
    combined = f"{description or ''} {counterparty or ''}".lower()
    if not combined.strip():
        return None
    
    # Layer 1: User-defined rules (highest priority)
    if rules:
        for rule in rules:
            text_to_check = ""
            if rule.match_field == "counterparty":
                text_to_check = (counterparty or "").lower()
            elif rule.match_field == "description":
                text_to_check = (description or "").lower()
            elif rule.match_field == "both":
                text_to_check = combined
            
            pattern = rule.match_pattern.lower()
            if rule.match_type == "contains" and pattern in text_to_check:
                return rule.category_id
            elif rule.match_type == "exact" and pattern == text_to_check.strip():
                return rule.category_id
            elif rule.match_type == "startswith" and text_to_check.startswith(pattern):
                return rule.category_id
    
    # Layer 2: Category keyword matching
    for cat in categories:
        if cat.keywords:
            for kw in cat.keywords:
                if kw.lower() in combined:
                    return cat.id
    return None


def parse_csv_or_excel(file_content: bytes, filename: str) -> pd.DataFrame:
    """Parse CSV or Excel file into DataFrame."""
    if filename.lower().endswith(('.xlsx', '.xls')):
        return pd.read_excel(io.BytesIO(file_content))
    else:
        # Try different encodings and separators
        for encoding in ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']:
            for sep in [',', ';', '\t', '|']:
                try:
                    df = pd.read_csv(io.BytesIO(file_content), encoding=encoding, sep=sep)
                    if len(df.columns) >= 2:
                        return df
                except:
                    continue
        raise ValueError("Could not parse CSV file. Please check the format.")


def parse_pdf_statement(file_content: bytes) -> pd.DataFrame:
    """Extract transactions from PDF bank statement."""
    import pdfplumber

    rows = []
    with pdfplumber.open(io.BytesIO(file_content)) as pdf:
        for page in pdf.pages:
            # Try table extraction first
            tables = page.extract_tables()
            if tables:
                for table in tables:
                    for row in table:
                        if row and len(row) >= 2:
                            rows.append(row)
            else:
                # Fall back to text extraction and line parsing
                text = page.extract_text()
                if text:
                    for line in text.split('\n'):
                        # Try to find lines that look like transactions
                        # Pattern: date + text + amount
                        match = re.match(
                            r'(\d{1,2}[./]\d{1,2}[./]\d{2,4})\s+(.+?)\s+([-]?\d[\d.,]*)\s*$',
                            line.strip()
                        )
                        if match:
                            rows.append([match.group(1), match.group(2), match.group(3)])

    if not rows:
        raise ValueError("Could not extract transactions from PDF. The format may not be supported.")

    # Try to use first row as header if it looks like headers
    if rows and any(h.lower() in ' '.join(str(c) for c in rows[0]).lower()
                     for h in ['datum', 'date', 'betrag', 'amount']):
        df = pd.DataFrame(rows[1:], columns=rows[0])
    else:
        # Assign generic columns
        if len(rows[0]) >= 4:
            df = pd.DataFrame(rows, columns=['Datum', 'Beschreibung', 'Empfänger', 'Betrag'] + [f'Col{i}' for i in range(4, len(rows[0]))])
        elif len(rows[0]) == 3:
            df = pd.DataFrame(rows, columns=['Datum', 'Beschreibung', 'Betrag'])
        else:
            df = pd.DataFrame(rows)

    return df


def import_transactions(
    db: Session,
    file_content: bytes,
    filename: str,
    entity_id: int,
    account_id: Optional[int],
    default_currency: Currency = Currency.EUR,
) -> dict:
    """
    Import transactions from file. Returns summary.
    """
    # Parse file
    if filename.lower().endswith('.pdf'):
        df = parse_pdf_statement(file_content)
    else:
        df = parse_csv_or_excel(file_content, filename)

    if df.empty:
        return {"imported": 0, "skipped": 0, "errors": ["File is empty"]}

    # Map columns
    date_col = find_column(df, "date")
    amount_col = find_column(df, "amount")
    desc_col = find_column(df, "description")
    counterparty_col = find_column(df, "counterparty")

    if not date_col or not amount_col:
        # Try using positional columns
        cols = list(df.columns)
        if len(cols) >= 2:
            date_col = date_col or cols[0]
            amount_col = amount_col or cols[-1]
            desc_col = desc_col or (cols[1] if len(cols) > 2 else None)

    if not date_col or not amount_col:
        return {"imported": 0, "skipped": 0, "errors": ["Could not identify date and amount columns"]}

    # Load categories and rules for auto-categorization
    categories = db.query(Category).all()
    rules = db.query(CategoryRule).order_by(CategoryRule.priority.desc()).all()

    imported = 0
    skipped = 0
    errors = []

    for idx, row in df.iterrows():
        try:
            # Parse date
            tx_date = parse_date(row[date_col])
            if not tx_date:
                skipped += 1
                continue

            # Parse amount
            amount = parse_amount(row[amount_col])
            if amount is None:
                skipped += 1
                continue

            # Description
            desc = str(row[desc_col]).strip() if desc_col and pd.notna(row.get(desc_col)) else ""
            counterparty = str(row[counterparty_col]).strip() if counterparty_col and pd.notna(row.get(counterparty_col)) else ""

            # Determine type
            tx_type = TransactionType.INCOME if amount >= 0 else TransactionType.EXPENSE
            amount = abs(amount)

            # Auto-categorize (rules + keywords)
            cat_id = auto_categorize(desc, counterparty, categories, rules)

            tx = Transaction(
                entity_id=entity_id,
                account_id=account_id,
                category_id=cat_id,
                transaction_type=tx_type,
                amount=amount,
                currency=default_currency,
                description=desc,
                counterparty=counterparty,
                transaction_date=tx_date.date(),
                is_imported=True,
                import_source=filename,
            )
            db.add(tx)
            imported += 1

        except Exception as e:
            errors.append(f"Row {idx}: {str(e)}")
            skipped += 1

    db.commit()

    return {
        "imported": imported,
        "skipped": skipped,
        "errors": errors[:10],  # Limit error messages
        "total_rows": len(df),
    }
