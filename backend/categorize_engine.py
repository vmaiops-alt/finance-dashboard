"""
Smart categorization engine.

Three-layer categorization:
1. User-defined rules (CategoryRule) — highest priority, created when user manually categorizes
2. Category keyword matching — from Category.keywords field (seeded defaults)
3. AI-like smart matching — pattern analysis from description/counterparty
"""
from sqlalchemy.orm import Session
from models import Category, CategoryRule, Transaction
from typing import Optional, List
from collections import Counter
from datetime import timedelta
import re


def apply_rules_to_transaction_batch(db: Session, transactions: List[Transaction]) -> dict:
    """
    Apply categorization rules to a batch of transactions.
    Pre-loads all rules, categories, and reference data ONCE to avoid N+1 queries.
    Returns dict of {transaction_id: category_id}.
    """
    if not transactions:
        return {}

    # Pre-load ALL rules once
    rules = db.query(CategoryRule).order_by(CategoryRule.priority.desc()).all()

    # Pre-load ALL categories once
    categories = db.query(Category).all()

    # Pre-load categorized transactions for smart matching (Layer 3)
    categorized_txs = db.query(Transaction).filter(
        Transaction.category_id.isnot(None)
    ).all()

    # Build lookup structures for Layer 3
    counterparty_to_cat = {}
    for ctx in categorized_txs:
        if ctx.counterparty:
            cp = ctx.counterparty.strip().lower()
            if cp not in counterparty_to_cat:
                counterparty_to_cat[cp] = ctx.category_id

    desc_words_to_cat = {}
    for ctx in categorized_txs:
        if ctx.description:
            for word in ctx.description.split():
                if len(word) > 3:
                    wl = word.lower()
                    if wl not in desc_words_to_cat:
                        desc_words_to_cat[wl] = ctx.category_id

    results = {}

    for tx in transactions:
        cat_id = None

        # Layer 1: User-defined rules
        for rule in rules:
            text_to_check = ""
            if rule.match_field == "counterparty":
                text_to_check = (tx.counterparty or "").lower()
            elif rule.match_field == "description":
                text_to_check = (tx.description or "").lower()
            elif rule.match_field == "both":
                text_to_check = f"{tx.counterparty or ''} {tx.description or ''}".lower()

            pattern = rule.match_pattern.lower()

            if rule.match_type == "contains" and pattern in text_to_check:
                cat_id = rule.category_id
                break
            elif rule.match_type == "exact" and pattern == text_to_check.strip():
                cat_id = rule.category_id
                break
            elif rule.match_type == "startswith" and text_to_check.startswith(pattern):
                cat_id = rule.category_id
                break

        # Layer 2: Category keyword matching
        if cat_id is None:
            combined = f"{tx.description or ''} {tx.counterparty or ''}".lower()
            for cat in categories:
                if cat.keywords:
                    for kw in cat.keywords:
                        if kw.lower() in combined:
                            cat_id = cat.id
                            break
                if cat_id is not None:
                    break

        # Layer 3: Smart matching from pre-loaded data
        if cat_id is None and tx.counterparty:
            cp = tx.counterparty.strip().lower()
            if cp in counterparty_to_cat:
                cat_id = counterparty_to_cat[cp]

        if cat_id is None and tx.description:
            desc_words = [w.lower() for w in tx.description.split() if len(w) > 3]
            for word in desc_words:
                if word in desc_words_to_cat:
                    cat_id = desc_words_to_cat[word]
                    break

        if cat_id is not None:
            results[tx.id] = cat_id

    return results


def apply_rules_to_transaction(db: Session, tx: Transaction) -> Optional[int]:
    """Apply categorization rules to a single transaction. Returns category_id or None."""
    result = apply_rules_to_transaction_batch(db, [tx])
    return result.get(tx.id)


def create_rule_from_categorization(db: Session, tx: Transaction, category_id: int):
    """When user manually categorizes a transaction, create a rule for future matches."""
    match_pattern = ""
    match_field = "both"

    if tx.counterparty and len(tx.counterparty.strip()) > 2:
        match_pattern = tx.counterparty.strip()
        match_field = "counterparty"
    elif tx.description and len(tx.description.strip()) > 2:
        match_pattern = tx.description.strip()
        match_field = "description"
    else:
        return None

    existing = db.query(CategoryRule).filter(
        CategoryRule.match_pattern.ilike(match_pattern),
        CategoryRule.match_field == match_field,
    ).first()

    if existing:
        existing.category_id = category_id
        db.commit()
        return existing

    rule = CategoryRule(
        category_id=category_id,
        match_field=match_field,
        match_pattern=match_pattern,
        match_type="contains",
        priority=10,
        is_user_created=True,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


def detect_recurring_transactions(db: Session, entity_id: Optional[int] = None) -> dict:
    """
    Analyze transactions to detect recurring payments.
    Groups by counterparty + similar amount, checks for regular intervals.
    """
    q = db.query(Transaction).filter(Transaction.transaction_type == "expense")
    if entity_id:
        q = q.filter(Transaction.entity_id == entity_id)

    txs = q.order_by(Transaction.transaction_date).all()

    groups = {}
    for tx in txs:
        key = (tx.counterparty or tx.description or "unknown").strip().lower()
        if key not in groups:
            groups[key] = []
        groups[key].append(tx)

    recurring = []

    for key, group_txs in groups.items():
        if len(group_txs) < 2:
            continue

        amounts = [tx.amount for tx in group_txs]
        avg_amount = sum(amounts) / len(amounts)
        amount_variance = max(amounts) - min(amounts)

        if avg_amount > 0 and (amount_variance / avg_amount) > 0.2:
            continue

        dates = sorted([tx.transaction_date for tx in group_txs])
        if len(dates) < 2:
            continue

        intervals = [(dates[i+1] - dates[i]).days for i in range(len(dates)-1)]
        avg_interval = sum(intervals) / len(intervals)

        interval_type = None
        if 5 <= avg_interval <= 10:
            interval_type = "weekly"
        elif 25 <= avg_interval <= 35:
            interval_type = "monthly"
        elif 55 <= avg_interval <= 65:
            interval_type = "bi-monthly"
        elif 85 <= avg_interval <= 100:
            interval_type = "quarterly"
        elif 350 <= avg_interval <= 380:
            interval_type = "yearly"

        if interval_type:
            for tx in group_txs:
                tx.is_recurring = True
                tx.recurring_interval = interval_type

            last_tx = group_txs[-1]
            recurring.append({
                "counterparty": last_tx.counterparty or last_tx.description,
                "amount": round(avg_amount, 2),
                "currency": last_tx.currency.value if last_tx.currency else "EUR",
                "interval": interval_type,
                "occurrences": len(group_txs),
                "last_date": dates[-1].isoformat(),
                "category": last_tx.category.name if last_tx.category else None,
                "category_id": last_tx.category_id,
                "transaction_ids": [tx.id for tx in group_txs],
            })

    db.commit()

    recurring.sort(key=lambda x: x["amount"], reverse=True)

    return {
        "recurring_payments": recurring,
        "total_monthly_recurring": round(sum(
            r["amount"] * (12 / {"weekly": 52, "monthly": 12, "bi-monthly": 6, "quarterly": 4, "yearly": 1}.get(r["interval"], 12))
            for r in recurring
        ) / 12, 2),
        "count": len(recurring),
    }


def _ai_categorize_batch(transactions: List[Transaction], categories: List[Category]) -> dict:
    """
    Use Claude API to categorize transactions that keyword/rule matching couldn't handle.
    Returns dict of {transaction_id: category_id}.
    Falls back gracefully if no API key or on error.
    """
    import os
    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not api_key or not transactions:
        return {}

    try:
        import anthropic
    except ImportError:
        print("anthropic package not installed — skipping AI categorization")
        return {}

    # Build category list for the prompt
    cat_map = {c.id: c.name for c in categories}
    cat_list = "\n".join(f"  {c.id}: {c.name}" for c in categories)

    # Process in batches of 50 to stay within token limits
    BATCH_SIZE = 50
    all_results = {}

    for batch_start in range(0, len(transactions), BATCH_SIZE):
        batch = transactions[batch_start:batch_start + BATCH_SIZE]
        tx_lines = []
        for tx in batch:
            tx_lines.append(
                f"  ID={tx.id} | type={tx.transaction_type.value} | "
                f"amount={tx.amount} | description=\"{tx.description or ''}\" | "
                f"counterparty=\"{tx.counterparty or ''}\""
            )
        tx_block = "\n".join(tx_lines)

        prompt = (
            f"You are a financial transaction categorizer. Assign each transaction to the most appropriate category.\n\n"
            f"Available categories:\n{cat_list}\n\n"
            f"Transactions to categorize:\n{tx_block}\n\n"
            f"Respond ONLY with a JSON object mapping transaction ID to category ID. "
            f"Example: {{\"1\": 5, \"2\": 3}}\n"
            f"If you cannot determine a category for a transaction, omit it from the response."
        )

        try:
            client = anthropic.Anthropic(api_key=api_key)
            response = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}],
            )
            text = response.content[0].text.strip()

            # Extract JSON from response (handle markdown code blocks)
            import json as _json
            if "```" in text:
                # Extract content between code fences
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
                text = text.strip()

            mapping = _json.loads(text)
            valid_cat_ids = set(cat_map.keys())
            for tx_id_str, cat_id in mapping.items():
                tx_id = int(tx_id_str)
                cat_id = int(cat_id)
                if cat_id in valid_cat_ids:
                    all_results[tx_id] = cat_id
        except Exception as e:
            print(f"AI categorization batch error (non-fatal): {e}")
            continue

    return all_results


def auto_categorize_all(db: Session, entity_id: Optional[int] = None, only_uncategorized: bool = True) -> dict:
    """
    Run auto-categorization on all (or uncategorized) transactions.
    Uses batch processing to avoid N+1 queries.
    Layer 4: AI categorization via Claude API for remaining uncategorized.
    """
    q = db.query(Transaction)
    if entity_id:
        q = q.filter(Transaction.entity_id == entity_id)
    if only_uncategorized:
        q = q.filter(Transaction.category_id.is_(None))

    txs = q.all()

    # Use batch function — only 3-4 DB queries total instead of N*5
    results = apply_rules_to_transaction_batch(db, txs)

    for tx in txs:
        if tx.id in results:
            tx.category_id = results[tx.id]

    # Layer 4: AI categorization for remaining uncategorized
    remaining = [tx for tx in txs if tx.id not in results]
    ai_categorized = 0
    if remaining:
        categories = db.query(Category).all()
        ai_results = _ai_categorize_batch(remaining, categories)
        for tx in remaining:
            if tx.id in ai_results:
                tx.category_id = ai_results[tx.id]
                results[tx.id] = ai_results[tx.id]
                ai_categorized += 1

    db.commit()

    return {
        "total_checked": len(txs),
        "categorized": len(results),
        "ai_categorized": ai_categorized,
        "remaining_uncategorized": len(txs) - len(results),
    }
