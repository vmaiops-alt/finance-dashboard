"""
Tax Engine — computes applicable tax on transfers between entities.

Logic:
1. Look up tax rules for the SOURCE entity's jurisdiction + transfer type.
2. If a specific TaxRule exists, use that rate.
3. Otherwise fall back to the jurisdiction's default rates based on transfer type.
4. For loans and loan repayments, generally 0% tax (principal is not income).
"""
from sqlalchemy.orm import Session
from models import Entity, Jurisdiction, TaxRule, Transfer, TransferType


def compute_transfer_tax(
    db: Session,
    from_entity_id: int,
    to_entity_id: int,
    transfer_type: TransferType,
    amount: float,
) -> dict:
    """
    Returns {tax_rate, tax_amount, net_amount}
    """
    from_entity = db.query(Entity).get(from_entity_id)
    to_entity = db.query(Entity).get(to_entity_id)

    if not from_entity or not to_entity:
        return {"tax_rate": 0.0, "tax_amount": 0.0, "net_amount": amount}

    # Determine which jurisdiction's rules to apply
    # For dividends/salary/management fees: tax at source (from_entity's jurisdiction)
    # For personal income: tax at recipient's jurisdiction
    source_jurisdiction_id = from_entity.jurisdiction_id
    recipient_jurisdiction_id = to_entity.jurisdiction_id

    tax_rate = 0.0

    # Step 1: Check for specific tax rules at source jurisdiction
    if source_jurisdiction_id:
        rule = db.query(TaxRule).filter(
            TaxRule.jurisdiction_id == source_jurisdiction_id,
            TaxRule.transfer_type == transfer_type,
        ).first()

        if rule:
            tax_rate = rule.tax_rate
        else:
            # Step 2: Fall back to jurisdiction defaults
            jurisdiction = db.query(Jurisdiction).get(source_jurisdiction_id)
            if jurisdiction:
                if transfer_type == TransferType.DIVIDEND:
                    tax_rate = jurisdiction.dividend_withholding_tax
                elif transfer_type == TransferType.SALARY:
                    # Salary taxed at recipient's personal income tax rate
                    if recipient_jurisdiction_id:
                        recip_j = db.query(Jurisdiction).get(recipient_jurisdiction_id)
                        tax_rate = recip_j.personal_income_tax_rate if recip_j else 0.0
                elif transfer_type in (TransferType.LOAN, TransferType.LOAN_REPAYMENT):
                    tax_rate = 0.0  # Loans are not taxable events
                elif transfer_type == TransferType.MANAGEMENT_FEE:
                    tax_rate = jurisdiction.corporate_tax_rate
                else:
                    tax_rate = 0.0

    # Also check if recipient has additional personal income tax
    # (e.g., receiving dividends while resident in Germany)
    if transfer_type == TransferType.DIVIDEND and recipient_jurisdiction_id:
        recip_j = db.query(Jurisdiction).get(recipient_jurisdiction_id)
        if recip_j and recip_j.personal_income_tax_rate > 0:
            # Some jurisdictions tax dividend income at personal level too
            # Check for specific rule at recipient level
            recip_rule = db.query(TaxRule).filter(
                TaxRule.jurisdiction_id == recipient_jurisdiction_id,
                TaxRule.transfer_type == TransferType.DIVIDEND,
            ).first()
            if recip_rule:
                # Use the higher of source WHT or recipient tax (simplified — no DTA)
                tax_rate = max(tax_rate, recip_rule.tax_rate)

    tax_amount = round(amount * tax_rate, 2)
    net_amount = round(amount - tax_amount, 2)

    return {
        "tax_rate": tax_rate,
        "tax_amount": tax_amount,
        "net_amount": net_amount,
    }


def compute_corporate_tax(db: Session, entity_id: int, profit: float) -> dict:
    """Compute corporate tax on profits for an entity."""
    entity = db.query(Entity).get(entity_id)
    if not entity or not entity.jurisdiction_id:
        return {"tax_rate": 0.0, "tax_amount": 0.0, "net_profit": profit}

    jurisdiction = db.query(Jurisdiction).get(entity.jurisdiction_id)
    if not jurisdiction:
        return {"tax_rate": 0.0, "tax_amount": 0.0, "net_profit": profit}

    tax_rate = jurisdiction.corporate_tax_rate
    tax_amount = round(max(0, profit) * tax_rate, 2)
    net_profit = round(profit - tax_amount, 2)

    return {
        "tax_rate": tax_rate,
        "tax_amount": tax_amount,
        "net_profit": net_profit,
    }
