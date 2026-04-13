from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from models import EntityType, TransactionType, TransferType, Currency


# ── Jurisdiction ───────────────────────────────────────────────────────────

class JurisdictionCreate(BaseModel):
    name: str
    country_code: str = ""
    corporate_tax_rate: float = 0.0
    personal_income_tax_rate: float = 0.0
    dividend_withholding_tax: float = 0.0
    vat_rate: float = 0.0
    notes: str = ""

class JurisdictionOut(JurisdictionCreate):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True


class TaxRuleCreate(BaseModel):
    jurisdiction_id: int
    transfer_type: TransferType
    tax_rate: float
    description: str = ""

class TaxRuleOut(TaxRuleCreate):
    id: int
    class Config:
        from_attributes = True


# ── Entity ─────────────────────────────────────────────────────────────────

class EntityCreate(BaseModel):
    name: str
    entity_type: EntityType
    jurisdiction_id: Optional[int] = None
    default_currency: Currency = Currency.EUR
    notes: str = ""
    color: str = "#3B82F6"

class EntityOut(EntityCreate):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True


# ── Account ────────────────────────────────────────────────────────────────

class AccountCreate(BaseModel):
    name: str
    bank_name: str = ""
    entity_id: int
    currency: Currency = Currency.EUR
    current_balance: float = 0.0
    notes: str = ""

class AccountUpdate(BaseModel):
    name: Optional[str] = None
    bank_name: Optional[str] = None
    currency: Optional[Currency] = None
    current_balance: Optional[float] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

class AccountOut(AccountCreate):
    id: int
    is_active: bool
    created_at: datetime
    class Config:
        from_attributes = True


# ── Category ───────────────────────────────────────────────────────────────

class CategoryCreate(BaseModel):
    name: str
    icon: str = ""
    color: str = "#6B7280"
    parent_id: Optional[int] = None
    keywords: List[str] = []

class CategoryOut(CategoryCreate):
    id: int
    class Config:
        from_attributes = True


# ── Transaction ────────────────────────────────────────────────────────────

class TransactionCreate(BaseModel):
    entity_id: int
    account_id: Optional[int] = None
    category_id: Optional[int] = None
    transaction_type: TransactionType
    amount: float
    currency: Currency = Currency.EUR
    description: str = ""
    counterparty: str = ""
    transaction_date: date
    is_recurring: bool = False
    recurring_interval: str = ""
    tags: List[str] = []

class TransactionOut(TransactionCreate):
    id: int
    is_imported: bool
    import_source: str
    created_at: datetime
    class Config:
        from_attributes = True


# ── Transfer ───────────────────────────────────────────────────────────────

class TransferCreate(BaseModel):
    from_entity_id: int
    to_entity_id: int
    from_account_id: Optional[int] = None
    to_account_id: Optional[int] = None
    transfer_type: TransferType
    amount: float
    currency: Currency = Currency.EUR
    transfer_date: date
    description: str = ""
    notes: str = ""

class TransferOut(TransferCreate):
    id: int
    tax_amount: float
    tax_rate_applied: float
    net_amount: float
    created_at: datetime
    class Config:
        from_attributes = True


# ── Loan ───────────────────────────────────────────────────────────────────

class LoanCreate(BaseModel):
    lender_entity_id: int
    borrower_entity_id: int
    principal_amount: float
    interest_rate: float = 0.0
    currency: Currency = Currency.EUR
    start_date: date
    maturity_date: Optional[date] = None
    notes: str = ""

class LoanOut(LoanCreate):
    id: int
    outstanding_balance: float
    is_active: bool
    created_at: datetime
    class Config:
        from_attributes = True


class LoanRepaymentCreate(BaseModel):
    loan_id: int
    amount: float
    principal_portion: float = 0.0
    interest_portion: float = 0.0
    payment_date: date
    notes: str = ""

class LoanRepaymentOut(LoanRepaymentCreate):
    id: int
    class Config:
        from_attributes = True


# ── Budget ─────────────────────────────────────────────────────────────────

class BudgetCreate(BaseModel):
    entity_id: Optional[int] = None
    category_id: Optional[int] = None
    amount: float
    currency: Currency = Currency.EUR
    period: str = "monthly"
    year: int
    month: Optional[int] = None

class BudgetOut(BudgetCreate):
    id: int
    class Config:
        from_attributes = True


# ── Dashboard ──────────────────────────────────────────────────────────────

class DashboardSummary(BaseModel):
    total_balance: float
    total_balance_by_currency: dict
    monthly_income: float
    monthly_expenses: float
    monthly_net: float
    top_expense_categories: list
    income_by_entity: list
    expenses_by_entity: list
    account_balances: list
    runway_months: float
    recent_transactions: list


class CashflowProjection(BaseModel):
    month: str
    projected_income: float
    projected_expenses: float
    projected_balance: float
    cumulative_balance: float


class RunwayAnalysis(BaseModel):
    current_total_balance: float
    avg_monthly_burn: float
    avg_monthly_income: float
    net_monthly_burn: float
    runway_months: float
    runway_until_date: Optional[str] = None
    target_date: Optional[str] = None
    amount_needed_for_target: Optional[float] = None


# ── Simulation ────────────────────────────────────────────────────────────

class SimulationEntry(BaseModel):
    label: str
    amount: float
    month: str  # "2026-05"
    type: str = "income"  # income | expense
    recurring: bool = False
    recur_until: Optional[str] = None  # "2027-12"

class SimulationScenario(BaseModel):
    name: str
    entries: List[SimulationEntry]

class SimulationRequest(BaseModel):
    scenarios: List[SimulationScenario]
    months: int = 24
    include_baseline: bool = True

class SimulationMonthData(BaseModel):
    month: str
    baseline: Optional[float] = None
    scenarios: dict  # {scenario_name: balance}

class SimulationResult(BaseModel):
    current_balance: float
    avg_monthly_income: float
    avg_monthly_expenses: float
    months_data: List[SimulationMonthData]
    scenario_summaries: List[dict]  # [{name, final_balance, delta_vs_baseline}]


# ── Category Rules ─────────────────────────────────────────────────────────

class CategoryRuleCreate(BaseModel):
    category_id: int
    match_field: str = "counterparty"  # counterparty | description | both
    match_pattern: str
    match_type: str = "contains"  # contains | exact | startswith
    priority: int = 0

class CategoryRuleOut(CategoryRuleCreate):
    id: int
    is_user_created: bool
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True


# ── Transaction Update (partial) ──────────────────────────────────────────

class TransactionUpdate(BaseModel):
    category_id: Optional[int] = None
    description: Optional[str] = None
    counterparty: Optional[str] = None
    transaction_type: Optional[TransactionType] = None
    amount: Optional[float] = None
    is_recurring: Optional[bool] = None
    recurring_interval: Optional[str] = None
    tags: Optional[List[str]] = None
