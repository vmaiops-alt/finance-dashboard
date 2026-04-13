"""
Finance Dashboard — FastAPI Backend
"""
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import date, datetime, timedelta
from dateutil.relativedelta import relativedelta
from typing import List, Optional
import json

from database import engine, get_db, Base
from models import (
    Jurisdiction, TaxRule, Entity, EntityType, Account, Category,
    Transaction, TransactionType, Transfer, TransferType, Currency,
    Loan, LoanRepayment, Budget, ExchangeRate,
)
from schemas import (
    JurisdictionCreate, JurisdictionOut,
    TaxRuleCreate, TaxRuleOut,
    EntityCreate, EntityOut,
    AccountCreate, AccountUpdate, AccountOut,
    CategoryCreate, CategoryOut,
    TransactionCreate, TransactionOut,
    TransferCreate, TransferOut,
    LoanCreate, LoanOut,
    LoanRepaymentCreate, LoanRepaymentOut,
    BudgetCreate, BudgetOut,
    DashboardSummary, CashflowProjection, RunwayAnalysis,
)
from tax_engine import compute_transfer_tax, compute_corporate_tax
from import_engine import import_transactions
from seed_data import seed_database

# ── App Setup ──────────────────────────────────────────────────────────────

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Finance Dashboard API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    from database import SessionLocal
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()


# ══════════════════════════════════════════════════════════════════════════
# JURISDICTIONS
# ══════════════════════════════════════════════════════════════════════════

@app.get("/api/jurisdictions", response_model=List[JurisdictionOut])
def list_jurisdictions(db: Session = Depends(get_db)):
    return db.query(Jurisdiction).all()


@app.post("/api/jurisdictions", response_model=JurisdictionOut)
def create_jurisdiction(data: JurisdictionCreate, db: Session = Depends(get_db)):
    j = Jurisdiction(**data.model_dump())
    db.add(j)
    db.commit()
    db.refresh(j)
    return j


@app.put("/api/jurisdictions/{jid}", response_model=JurisdictionOut)
def update_jurisdiction(jid: int, data: JurisdictionCreate, db: Session = Depends(get_db)):
    j = db.query(Jurisdiction).get(jid)
    if not j:
        raise HTTPException(404, "Jurisdiction not found")
    for k, v in data.model_dump().items():
        setattr(j, k, v)
    db.commit()
    db.refresh(j)
    return j


@app.delete("/api/jurisdictions/{jid}")
def delete_jurisdiction(jid: int, db: Session = Depends(get_db)):
    j = db.query(Jurisdiction).get(jid)
    if not j:
        raise HTTPException(404)
    db.delete(j)
    db.commit()
    return {"ok": True}


# Tax Rules
@app.get("/api/tax-rules", response_model=List[TaxRuleOut])
def list_tax_rules(jurisdiction_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(TaxRule)
    if jurisdiction_id:
        q = q.filter(TaxRule.jurisdiction_id == jurisdiction_id)
    return q.all()


@app.post("/api/tax-rules", response_model=TaxRuleOut)
def create_tax_rule(data: TaxRuleCreate, db: Session = Depends(get_db)):
    r = TaxRule(**data.model_dump())
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


@app.delete("/api/tax-rules/{rid}")
def delete_tax_rule(rid: int, db: Session = Depends(get_db)):
    r = db.query(TaxRule).get(rid)
    if r:
        db.delete(r)
        db.commit()
    return {"ok": True}


# ══════════════════════════════════════════════════════════════════════════
# ENTITIES (Personal + Companies)
# ══════════════════════════════════════════════════════════════════════════

@app.get("/api/entities", response_model=List[EntityOut])
def list_entities(entity_type: Optional[EntityType] = None, db: Session = Depends(get_db)):
    q = db.query(Entity)
    if entity_type:
        q = q.filter(Entity.entity_type == entity_type)
    return q.order_by(Entity.created_at).all()


@app.post("/api/entities", response_model=EntityOut)
def create_entity(data: EntityCreate, db: Session = Depends(get_db)):
    e = Entity(**data.model_dump())
    db.add(e)
    db.commit()
    db.refresh(e)
    return e


@app.put("/api/entities/{eid}", response_model=EntityOut)
def update_entity(eid: int, data: EntityCreate, db: Session = Depends(get_db)):
    e = db.query(Entity).get(eid)
    if not e:
        raise HTTPException(404)
    for k, v in data.model_dump().items():
        setattr(e, k, v)
    db.commit()
    db.refresh(e)
    return e


@app.delete("/api/entities/{eid}")
def delete_entity(eid: int, db: Session = Depends(get_db)):
    e = db.query(Entity).get(eid)
    if not e:
        raise HTTPException(404)
    db.delete(e)
    db.commit()
    return {"ok": True}


# ══════════════════════════════════════════════════════════════════════════
# ACCOUNTS
# ══════════════════════════════════════════════════════════════════════════

@app.get("/api/accounts", response_model=List[AccountOut])
def list_accounts(entity_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(Account).filter(Account.is_active == True)
    if entity_id:
        q = q.filter(Account.entity_id == entity_id)
    return q.all()


@app.post("/api/accounts", response_model=AccountOut)
def create_account(data: AccountCreate, db: Session = Depends(get_db)):
    a = Account(**data.model_dump())
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


@app.put("/api/accounts/{aid}", response_model=AccountOut)
def update_account(aid: int, data: AccountUpdate, db: Session = Depends(get_db)):
    a = db.query(Account).get(aid)
    if not a:
        raise HTTPException(404)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(a, k, v)
    db.commit()
    db.refresh(a)
    return a


@app.delete("/api/accounts/{aid}")
def delete_account(aid: int, db: Session = Depends(get_db)):
    a = db.query(Account).get(aid)
    if a:
        a.is_active = False
        db.commit()
    return {"ok": True}


# ══════════════════════════════════════════════════════════════════════════
# CATEGORIES
# ══════════════════════════════════════════════════════════════════════════

@app.get("/api/categories", response_model=List[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return db.query(Category).all()


@app.post("/api/categories", response_model=CategoryOut)
def create_category(data: CategoryCreate, db: Session = Depends(get_db)):
    c = Category(**data.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@app.put("/api/categories/{cid}", response_model=CategoryOut)
def update_category(cid: int, data: CategoryCreate, db: Session = Depends(get_db)):
    c = db.query(Category).get(cid)
    if not c:
        raise HTTPException(404)
    for k, v in data.model_dump().items():
        setattr(c, k, v)
    db.commit()
    db.refresh(c)
    return c


@app.delete("/api/categories/{cid}")
def delete_category(cid: int, db: Session = Depends(get_db)):
    c = db.query(Category).get(cid)
    if c:
        db.delete(c)
        db.commit()
    return {"ok": True}


# ══════════════════════════════════════════════════════════════════════════
# TRANSACTIONS
# ══════════════════════════════════════════════════════════════════════════

@app.get("/api/transactions", response_model=List[TransactionOut])
def list_transactions(
    entity_id: Optional[int] = None,
    account_id: Optional[int] = None,
    category_id: Optional[int] = None,
    tx_type: Optional[TransactionType] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    limit: int = 200,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    q = db.query(Transaction)
    if entity_id:
        q = q.filter(Transaction.entity_id == entity_id)
    if account_id:
        q = q.filter(Transaction.account_id == account_id)
    if category_id:
        q = q.filter(Transaction.category_id == category_id)
    if tx_type:
        q = q.filter(Transaction.transaction_type == tx_type)
    if date_from:
        q = q.filter(Transaction.transaction_date >= date_from)
    if date_to:
        q = q.filter(Transaction.transaction_date <= date_to)
    return q.order_by(Transaction.transaction_date.desc()).offset(offset).limit(limit).all()


@app.post("/api/transactions", response_model=TransactionOut)
def create_transaction(data: TransactionCreate, db: Session = Depends(get_db)):
    tx = Transaction(**data.model_dump())
    db.add(tx)
    # Update account balance
    if tx.account_id:
        account = db.query(Account).get(tx.account_id)
        if account:
            if tx.transaction_type == TransactionType.INCOME:
                account.current_balance += tx.amount
            else:
                account.current_balance -= tx.amount
    db.commit()
    db.refresh(tx)
    return tx


@app.put("/api/transactions/{tid}", response_model=TransactionOut)
def update_transaction(tid: int, data: TransactionCreate, db: Session = Depends(get_db)):
    tx = db.query(Transaction).get(tid)
    if not tx:
        raise HTTPException(404)
    # Reverse old balance impact
    if tx.account_id:
        account = db.query(Account).get(tx.account_id)
        if account:
            if tx.transaction_type == TransactionType.INCOME:
                account.current_balance -= tx.amount
            else:
                account.current_balance += tx.amount
    # Apply new values
    for k, v in data.model_dump().items():
        setattr(tx, k, v)
    # Apply new balance impact
    if tx.account_id:
        account = db.query(Account).get(tx.account_id)
        if account:
            if tx.transaction_type == TransactionType.INCOME:
                account.current_balance += tx.amount
            else:
                account.current_balance -= tx.amount
    db.commit()
    db.refresh(tx)
    return tx


@app.delete("/api/transactions/{tid}")
def delete_transaction(tid: int, db: Session = Depends(get_db)):
    tx = db.query(Transaction).get(tid)
    if tx:
        if tx.account_id:
            account = db.query(Account).get(tx.account_id)
            if account:
                if tx.transaction_type == TransactionType.INCOME:
                    account.current_balance -= tx.amount
                else:
                    account.current_balance += tx.amount
        db.delete(tx)
        db.commit()
    return {"ok": True}


# ══════════════════════════════════════════════════════════════════════════
# TRANSFERS
# ══════════════════════════════════════════════════════════════════════════

@app.get("/api/transfers", response_model=List[TransferOut])
def list_transfers(
    entity_id: Optional[int] = None,
    transfer_type: Optional[TransferType] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Transfer)
    if entity_id:
        q = q.filter((Transfer.from_entity_id == entity_id) | (Transfer.to_entity_id == entity_id))
    if transfer_type:
        q = q.filter(Transfer.transfer_type == transfer_type)
    return q.order_by(Transfer.transfer_date.desc()).all()


@app.post("/api/transfers", response_model=TransferOut)
def create_transfer(data: TransferCreate, db: Session = Depends(get_db)):
    # Compute tax
    tax_info = compute_transfer_tax(
        db, data.from_entity_id, data.to_entity_id,
        data.transfer_type, data.amount
    )

    t = Transfer(
        **data.model_dump(),
        tax_amount=tax_info["tax_amount"],
        tax_rate_applied=tax_info["tax_rate"],
        net_amount=tax_info["net_amount"],
    )
    db.add(t)

    # Update account balances
    if data.from_account_id:
        from_acc = db.query(Account).get(data.from_account_id)
        if from_acc:
            from_acc.current_balance -= data.amount
    if data.to_account_id:
        to_acc = db.query(Account).get(data.to_account_id)
        if to_acc:
            to_acc.current_balance += tax_info["net_amount"]

    # If it's a loan, create/update loan record
    if data.transfer_type == TransferType.LOAN:
        loan = Loan(
            lender_entity_id=data.from_entity_id,
            borrower_entity_id=data.to_entity_id,
            principal_amount=data.amount,
            outstanding_balance=data.amount,
            currency=data.currency,
            start_date=data.transfer_date,
        )
        db.add(loan)

    db.commit()
    db.refresh(t)
    return t


@app.delete("/api/transfers/{tid}")
def delete_transfer(tid: int, db: Session = Depends(get_db)):
    t = db.query(Transfer).get(tid)
    if t:
        db.delete(t)
        db.commit()
    return {"ok": True}


# ══════════════════════════════════════════════════════════════════════════
# LOANS
# ══════════════════════════════════════════════════════════════════════════

@app.get("/api/loans", response_model=List[LoanOut])
def list_loans(entity_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(Loan)
    if entity_id:
        q = q.filter((Loan.lender_entity_id == entity_id) | (Loan.borrower_entity_id == entity_id))
    return q.all()


@app.post("/api/loans", response_model=LoanOut)
def create_loan(data: LoanCreate, db: Session = Depends(get_db)):
    l = Loan(**data.model_dump(), outstanding_balance=data.principal_amount)
    db.add(l)
    db.commit()
    db.refresh(l)
    return l


@app.post("/api/loan-repayments", response_model=LoanRepaymentOut)
def create_loan_repayment(data: LoanRepaymentCreate, db: Session = Depends(get_db)):
    loan = db.query(Loan).get(data.loan_id)
    if not loan:
        raise HTTPException(404, "Loan not found")
    r = LoanRepayment(**data.model_dump())
    db.add(r)
    loan.outstanding_balance -= data.principal_portion
    if loan.outstanding_balance <= 0:
        loan.outstanding_balance = 0
        loan.is_active = False
    db.commit()
    db.refresh(r)
    return r


# ══════════════════════════════════════════════════════════════════════════
# BUDGETS
# ══════════════════════════════════════════════════════════════════════════

@app.get("/api/budgets", response_model=List[BudgetOut])
def list_budgets(year: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(Budget)
    if year:
        q = q.filter(Budget.year == year)
    return q.all()


@app.post("/api/budgets", response_model=BudgetOut)
def create_budget(data: BudgetCreate, db: Session = Depends(get_db)):
    b = Budget(**data.model_dump())
    db.add(b)
    db.commit()
    db.refresh(b)
    return b


@app.delete("/api/budgets/{bid}")
def delete_budget(bid: int, db: Session = Depends(get_db)):
    b = db.query(Budget).get(bid)
    if b:
        db.delete(b)
        db.commit()
    return {"ok": True}


# ══════════════════════════════════════════════════════════════════════════
# IMPORT
# ══════════════════════════════════════════════════════════════════════════

@app.post("/api/import")
async def import_file(
    file: UploadFile = File(...),
    entity_id: int = Form(...),
    account_id: Optional[int] = Form(None),
    currency: str = Form("EUR"),
    db: Session = Depends(get_db),
):
    content = await file.read()
    try:
        cur = Currency(currency)
    except:
        cur = Currency.EUR

    result = import_transactions(db, content, file.filename, entity_id, account_id, cur)
    return result


# ══════════════════════════════════════════════════════════════════════════
# DASHBOARD & ANALYTICS
# ══════════════════════════════════════════════════════════════════════════

@app.get("/api/dashboard/summary")
def dashboard_summary(
    year: Optional[int] = None,
    month: Optional[int] = None,
    db: Session = Depends(get_db),
):
    now = date.today()
    y = year or now.year
    m = month or now.month

    # Total balance across all accounts
    accounts = db.query(Account).filter(Account.is_active == True).all()
    total_balance = sum(a.current_balance for a in accounts)
    balance_by_currency = {}
    for a in accounts:
        cur = a.currency.value if a.currency else "EUR"
        balance_by_currency[cur] = balance_by_currency.get(cur, 0) + a.current_balance

    # Monthly transactions
    month_start = date(y, m, 1)
    if m == 12:
        month_end = date(y + 1, 1, 1) - timedelta(days=1)
    else:
        month_end = date(y, m + 1, 1) - timedelta(days=1)

    monthly_txs = db.query(Transaction).filter(
        Transaction.transaction_date >= month_start,
        Transaction.transaction_date <= month_end,
    ).all()

    monthly_income = sum(t.amount for t in monthly_txs if t.transaction_type == TransactionType.INCOME)
    monthly_expenses = sum(t.amount for t in monthly_txs if t.transaction_type == TransactionType.EXPENSE)

    # Top expense categories
    expense_by_cat = {}
    for t in monthly_txs:
        if t.transaction_type == TransactionType.EXPENSE:
            cat_name = "Unkategorisiert"
            if t.category_id:
                cat = db.query(Category).get(t.category_id)
                if cat:
                    cat_name = cat.name
            expense_by_cat[cat_name] = expense_by_cat.get(cat_name, 0) + t.amount

    top_categories = sorted(expense_by_cat.items(), key=lambda x: x[1], reverse=True)[:10]

    # Income/Expenses by entity
    entities = db.query(Entity).all()
    income_by_entity = []
    expenses_by_entity = []
    for e in entities:
        e_income = sum(t.amount for t in monthly_txs if t.entity_id == e.id and t.transaction_type == TransactionType.INCOME)
        e_expenses = sum(t.amount for t in monthly_txs if t.entity_id == e.id and t.transaction_type == TransactionType.EXPENSE)
        if e_income > 0:
            income_by_entity.append({"entity": e.name, "amount": e_income, "color": e.color})
        if e_expenses > 0:
            expenses_by_entity.append({"entity": e.name, "amount": e_expenses, "color": e.color})

    # Account balances for display
    account_balances = [
        {
            "id": a.id,
            "name": a.name,
            "bank": a.bank_name,
            "balance": a.current_balance,
            "currency": a.currency.value if a.currency else "EUR",
            "entity_id": a.entity_id,
        }
        for a in accounts
    ]

    # Recent transactions
    recent = db.query(Transaction).order_by(Transaction.transaction_date.desc()).limit(15).all()
    recent_list = []
    for t in recent:
        cat_name = ""
        if t.category_id:
            cat = db.query(Category).get(t.category_id)
            cat_name = cat.name if cat else ""
        recent_list.append({
            "id": t.id,
            "date": t.transaction_date.isoformat(),
            "type": t.transaction_type.value,
            "amount": t.amount,
            "description": t.description,
            "category": cat_name,
            "counterparty": t.counterparty,
        })

    # Runway calculation
    last_6_months = []
    for i in range(1, 7):
        d = now - relativedelta(months=i)
        ms = date(d.year, d.month, 1)
        if d.month == 12:
            me = date(d.year + 1, 1, 1) - timedelta(days=1)
        else:
            me = date(d.year, d.month + 1, 1) - timedelta(days=1)
        txs = db.query(Transaction).filter(
            Transaction.transaction_date >= ms,
            Transaction.transaction_date <= me,
        ).all()
        exp = sum(t.amount for t in txs if t.transaction_type == TransactionType.EXPENSE)
        inc = sum(t.amount for t in txs if t.transaction_type == TransactionType.INCOME)
        last_6_months.append({"expenses": exp, "income": inc})

    avg_expenses = sum(m["expenses"] for m in last_6_months) / max(len(last_6_months), 1)
    avg_income = sum(m["income"] for m in last_6_months) / max(len(last_6_months), 1)
    net_burn = avg_expenses - avg_income
    runway = total_balance / net_burn if net_burn > 0 else 999

    return {
        "total_balance": round(total_balance, 2),
        "total_balance_by_currency": {k: round(v, 2) for k, v in balance_by_currency.items()},
        "monthly_income": round(monthly_income, 2),
        "monthly_expenses": round(monthly_expenses, 2),
        "monthly_net": round(monthly_income - monthly_expenses, 2),
        "top_expense_categories": [{"category": c, "amount": round(a, 2)} for c, a in top_categories],
        "income_by_entity": income_by_entity,
        "expenses_by_entity": expenses_by_entity,
        "account_balances": account_balances,
        "runway_months": round(runway, 1),
        "recent_transactions": recent_list,
        "avg_monthly_expenses": round(avg_expenses, 2),
        "avg_monthly_income": round(avg_income, 2),
    }


@app.get("/api/dashboard/cashflow-projection")
def cashflow_projection(
    months: int = Query(12, ge=1, le=60),
    db: Session = Depends(get_db),
):
    """Project cashflow for the next N months based on historical averages."""
    now = date.today()

    # Calculate averages from last 6 months
    totals_exp = []
    totals_inc = []
    for i in range(1, 7):
        d = now - relativedelta(months=i)
        ms = date(d.year, d.month, 1)
        me = date(d.year, d.month + 1, 1) - timedelta(days=1) if d.month < 12 else date(d.year, 12, 31)
        txs = db.query(Transaction).filter(
            Transaction.transaction_date >= ms,
            Transaction.transaction_date <= me,
        ).all()
        totals_exp.append(sum(t.amount for t in txs if t.transaction_type == TransactionType.EXPENSE))
        totals_inc.append(sum(t.amount for t in txs if t.transaction_type == TransactionType.INCOME))

    avg_exp = sum(totals_exp) / max(len(totals_exp), 1)
    avg_inc = sum(totals_inc) / max(len(totals_inc), 1)

    # Current balance
    accounts = db.query(Account).filter(Account.is_active == True).all()
    current_balance = sum(a.current_balance for a in accounts)

    projections = []
    cumulative = current_balance
    for i in range(months):
        future = now + relativedelta(months=i + 1)
        month_str = future.strftime("%Y-%m")
        cumulative += avg_inc - avg_exp
        projections.append({
            "month": month_str,
            "projected_income": round(avg_inc, 2),
            "projected_expenses": round(avg_exp, 2),
            "projected_net": round(avg_inc - avg_exp, 2),
            "cumulative_balance": round(cumulative, 2),
        })

    return projections


@app.get("/api/dashboard/runway")
def runway_analysis(
    target_date: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Detailed runway analysis."""
    now = date.today()

    accounts = db.query(Account).filter(Account.is_active == True).all()
    total_balance = sum(a.current_balance for a in accounts)

    # Last 6 months averages
    monthly_data = []
    for i in range(1, 7):
        d = now - relativedelta(months=i)
        ms = date(d.year, d.month, 1)
        me = date(d.year, d.month + 1, 1) - timedelta(days=1) if d.month < 12 else date(d.year, 12, 31)
        txs = db.query(Transaction).filter(
            Transaction.transaction_date >= ms,
            Transaction.transaction_date <= me,
        ).all()
        exp = sum(t.amount for t in txs if t.transaction_type == TransactionType.EXPENSE)
        inc = sum(t.amount for t in txs if t.transaction_type == TransactionType.INCOME)
        monthly_data.append({"expenses": exp, "income": inc})

    avg_exp = sum(m["expenses"] for m in monthly_data) / max(len(monthly_data), 1)
    avg_inc = sum(m["income"] for m in monthly_data) / max(len(monthly_data), 1)
    net_burn = avg_exp - avg_inc

    runway_months = total_balance / net_burn if net_burn > 0 else 999
    runway_date = (now + relativedelta(months=int(runway_months))).isoformat() if runway_months < 999 else None

    result = {
        "current_total_balance": round(total_balance, 2),
        "avg_monthly_burn": round(avg_exp, 2),
        "avg_monthly_income": round(avg_inc, 2),
        "net_monthly_burn": round(net_burn, 2),
        "runway_months": round(runway_months, 1),
        "runway_until_date": runway_date,
    }

    if target_date:
        try:
            td = date.fromisoformat(target_date)
            months_to_target = (td.year - now.year) * 12 + (td.month - now.month)
            needed = net_burn * months_to_target - total_balance
            result["target_date"] = target_date
            result["months_to_target"] = months_to_target
            result["amount_needed_for_target"] = round(max(0, needed), 2)
        except:
            pass

    return result


@app.get("/api/dashboard/tax-overview")
def tax_overview(
    year: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Tax overview per entity and jurisdiction."""
    y = year or date.today().year
    year_start = date(y, 1, 1)
    year_end = date(y, 12, 31)

    entities = db.query(Entity).all()
    overview = []

    for entity in entities:
        # Income & Expenses
        txs = db.query(Transaction).filter(
            Transaction.entity_id == entity.id,
            Transaction.transaction_date >= year_start,
            Transaction.transaction_date <= year_end,
        ).all()

        income = sum(t.amount for t in txs if t.transaction_type == TransactionType.INCOME)
        expenses = sum(t.amount for t in txs if t.transaction_type == TransactionType.EXPENSE)
        profit = income - expenses

        # Corporate tax
        corp_tax = compute_corporate_tax(db, entity.id, profit)

        # Transfers tax paid
        transfers = db.query(Transfer).filter(
            (Transfer.from_entity_id == entity.id) | (Transfer.to_entity_id == entity.id),
            Transfer.transfer_date >= year_start,
            Transfer.transfer_date <= year_end,
        ).all()

        transfer_tax_paid = sum(t.tax_amount for t in transfers if t.from_entity_id == entity.id)
        dividends_paid = sum(t.amount for t in transfers if t.from_entity_id == entity.id and t.transfer_type == TransferType.DIVIDEND)
        dividends_received = sum(t.net_amount for t in transfers if t.to_entity_id == entity.id and t.transfer_type == TransferType.DIVIDEND)

        jurisdiction = db.query(Jurisdiction).get(entity.jurisdiction_id) if entity.jurisdiction_id else None

        overview.append({
            "entity_id": entity.id,
            "entity_name": entity.name,
            "entity_type": entity.entity_type.value,
            "jurisdiction": jurisdiction.name if jurisdiction else "N/A",
            "revenue": round(income, 2),
            "expenses": round(expenses, 2),
            "profit": round(profit, 2),
            "corporate_tax_rate": corp_tax["tax_rate"],
            "corporate_tax_amount": corp_tax["tax_amount"],
            "net_profit": corp_tax["net_profit"],
            "dividends_paid": round(dividends_paid, 2),
            "dividends_received": round(dividends_received, 2),
            "transfer_tax_paid": round(transfer_tax_paid, 2),
            "total_tax_burden": round(corp_tax["tax_amount"] + transfer_tax_paid, 2),
        })

    return overview


@app.get("/api/dashboard/monthly-trend")
def monthly_trend(
    months: int = Query(12, ge=1, le=60),
    entity_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Monthly income/expense trend."""
    now = date.today()
    data = []

    for i in range(months - 1, -1, -1):
        d = now - relativedelta(months=i)
        ms = date(d.year, d.month, 1)
        me = date(d.year, d.month + 1, 1) - timedelta(days=1) if d.month < 12 else date(d.year, 12, 31)

        q = db.query(Transaction).filter(
            Transaction.transaction_date >= ms,
            Transaction.transaction_date <= me,
        )
        if entity_id:
            q = q.filter(Transaction.entity_id == entity_id)

        txs = q.all()
        income = sum(t.amount for t in txs if t.transaction_type == TransactionType.INCOME)
        expenses = sum(t.amount for t in txs if t.transaction_type == TransactionType.EXPENSE)

        data.append({
            "month": ms.strftime("%Y-%m"),
            "label": ms.strftime("%b %Y"),
            "income": round(income, 2),
            "expenses": round(expenses, 2),
            "net": round(income - expenses, 2),
        })

    return data


# ══════════════════════════════════════════════════════════════════════════
# EXCHANGE RATES
# ══════════════════════════════════════════════════════════════════════════

@app.get("/api/exchange-rates")
def list_exchange_rates(db: Session = Depends(get_db)):
    return db.query(ExchangeRate).order_by(ExchangeRate.rate_date.desc()).limit(50).all()


@app.post("/api/exchange-rates")
def set_exchange_rate(
    from_currency: str,
    to_currency: str,
    rate: float,
    db: Session = Depends(get_db),
):
    er = ExchangeRate(
        from_currency=Currency(from_currency),
        to_currency=Currency(to_currency),
        rate=rate,
        rate_date=date.today(),
    )
    db.add(er)
    db.commit()
    return {"ok": True}


# ══════════════════════════════════════════════════════════════════════════
# SIMULATION
# ══════════════════════════════════════════════════════════════════════════

@app.post("/api/simulation")
def run_simulation(req: schemas.SimulationRequest, db: Session = Depends(get_db)):
    """Run cashflow simulation with hypothetical scenarios."""
    from dateutil.relat