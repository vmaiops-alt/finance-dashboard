from sqlalchemy import (
    Column, Integer, String, Float, Date, DateTime, Boolean,
    ForeignKey, Enum as SQLEnum, Text, JSON
)
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime, date
import enum


# ── Enums ──────────────────────────────────────────────────────────────────

class EntityType(str, enum.Enum):
    PERSONAL = "personal"
    COMPANY = "company"


class TransactionType(str, enum.Enum):
    INCOME = "income"
    EXPENSE = "expense"


class TransferType(str, enum.Enum):
    DIVIDEND = "dividend"
    SALARY = "salary"
    LOAN = "loan"
    LOAN_REPAYMENT = "loan_repayment"
    MANAGEMENT_FEE = "management_fee"
    INTERCOMPANY = "intercompany"
    OTHER = "other"


class Currency(str, enum.Enum):
    EUR = "EUR"
    USD = "USD"
    GBP = "GBP"
    AED = "AED"
    CHF = "CHF"


# ── Jurisdiction & Tax Rules ───────────────────────────────────────────────

class Jurisdiction(Base):
    __tablename__ = "jurisdictions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)  # e.g. "Cyprus", "UAE/Dubai"
    country_code = Column(String(3))
    corporate_tax_rate = Column(Float, default=0.0)  # e.g. 0.125 for 12.5%
    personal_income_tax_rate = Column(Float, default=0.0)
    dividend_withholding_tax = Column(Float, default=0.0)
    vat_rate = Column(Float, default=0.0)
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    entities = relationship("Entity", back_populates="jurisdiction")
    tax_rules = relationship("TaxRule", back_populates="jurisdiction")


class TaxRule(Base):
    """Custom tax rules per jurisdiction for specific transfer types."""
    __tablename__ = "tax_rules"

    id = Column(Integer, primary_key=True, index=True)
    jurisdiction_id = Column(Integer, ForeignKey("jurisdictions.id"), nullable=False)
    transfer_type = Column(SQLEnum(TransferType), nullable=False)
    tax_rate = Column(Float, nullable=False)  # Applied rate
    description = Column(Text, default="")

    jurisdiction = relationship("Jurisdiction", back_populates="tax_rules")


# ── Entity (Person or Company) ─────────────────────────────────────────────

class Entity(Base):
    __tablename__ = "entities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    entity_type = Column(SQLEnum(EntityType), nullable=False)
    jurisdiction_id = Column(Integer, ForeignKey("jurisdictions.id"), nullable=True)
    default_currency = Column(SQLEnum(Currency), default=Currency.EUR)
    notes = Column(Text, default="")
    color = Column(String(7), default="#3B82F6")  # Hex color for UI
    created_at = Column(DateTime, default=datetime.utcnow)

    jurisdiction = relationship("Jurisdiction", back_populates="entities")
    accounts = relationship("Account", back_populates="entity", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="entity", cascade="all, delete-orphan")
    transfers_out = relationship("Transfer", foreign_keys="Transfer.from_entity_id", back_populates="from_entity")
    transfers_in = relationship("Transfer", foreign_keys="Transfer.to_entity_id", back_populates="to_entity")


# ── Bank Account ───────────────────────────────────────────────────────────

class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)  # e.g. "Sparkasse Girokonto"
    bank_name = Column(String, default="")
    entity_id = Column(Integer, ForeignKey("entities.id"), nullable=False)
    currency = Column(SQLEnum(Currency), default=Currency.EUR)
    current_balance = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    entity = relationship("Entity", back_populates="accounts")
    transactions = relationship("Transaction", back_populates="account", cascade="all, delete-orphan")


# ── Category ───────────────────────────────────────────────────────────────

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    icon = Column(String, default="")
    color = Column(String(7), default="#6B7280")
    parent_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    keywords = Column(JSON, default=[])  # For auto-categorization

    parent = relationship("Category", remote_side=[id])
    transactions = relationship("Transaction", back_populates="category")


# ── Transaction ────────────────────────────────────────────────────────────

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("entities.id"), nullable=False)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    transaction_type = Column(SQLEnum(TransactionType), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(SQLEnum(Currency), default=Currency.EUR)
    description = Column(String, default="")
    counterparty = Column(String, default="")  # Who paid / who received
    transaction_date = Column(Date, nullable=False)
    is_imported = Column(Boolean, default=False)
    import_source = Column(String, default="")
    is_recurring = Column(Boolean, default=False)
    recurring_interval = Column(String, default="")  # monthly, weekly, yearly
    tags = Column(JSON, default=[])
    created_at = Column(DateTime, default=datetime.utcnow)

    entity = relationship("Entity", back_populates="transactions")
    account = relationship("Account", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")


# ── Transfer (between entities) ────────────────────────────────────────────

class Transfer(Base):
    __tablename__ = "transfers"

    id = Column(Integer, primary_key=True, index=True)
    from_entity_id = Column(Integer, ForeignKey("entities.id"), nullable=False)
    to_entity_id = Column(Integer, ForeignKey("entities.id"), nullable=False)
    from_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    to_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    transfer_type = Column(SQLEnum(TransferType), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(SQLEnum(Currency), default=Currency.EUR)
    tax_amount = Column(Float, default=0.0)  # Computed tax
    tax_rate_applied = Column(Float, default=0.0)
    net_amount = Column(Float, default=0.0)  # After tax
    transfer_date = Column(Date, nullable=False)
    description = Column(Text, default="")
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    from_entity = relationship("Entity", foreign_keys=[from_entity_id], back_populates="transfers_out")
    to_entity = relationship("Entity", foreign_keys=[to_entity_id], back_populates="transfers_in")


# ── Loan Tracking ──────────────────────────────────────────────────────────

class Loan(Base):
    __tablename__ = "loans"

    id = Column(Integer, primary_key=True, index=True)
    lender_entity_id = Column(Integer, ForeignKey("entities.id"), nullable=False)
    borrower_entity_id = Column(Integer, ForeignKey("entities.id"), nullable=False)
    principal_amount = Column(Float, nullable=False)
    interest_rate = Column(Float, default=0.0)  # Annual rate
    outstanding_balance = Column(Float, nullable=False)
    currency = Column(SQLEnum(Currency), default=Currency.EUR)
    start_date = Column(Date, nullable=False)
    maturity_date = Column(Date, nullable=True)
    notes = Column(Text, default="")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    lender = relationship("Entity", foreign_keys=[lender_entity_id])
    borrower = relationship("Entity", foreign_keys=[borrower_entity_id])
    repayments = relationship("LoanRepayment", back_populates="loan", cascade="all, delete-orphan")


class LoanRepayment(Base):
    __tablename__ = "loan_repayments"

    id = Column(Integer, primary_key=True, index=True)
    loan_id = Column(Integer, ForeignKey("loans.id"), nullable=False)
    amount = Column(Float, nullable=False)
    principal_portion = Column(Float, default=0.0)
    interest_portion = Column(Float, default=0.0)
    payment_date = Column(Date, nullable=False)
    notes = Column(Text, default="")

    loan = relationship("Loan", back_populates="repayments")


# ── Budget ─────────────────────────────────────────────────────────────────

class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("entities.id"), nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    amount = Column(Float, nullable=False)
    currency = Column(SQLEnum(Currency), default=Currency.EUR)
    period = Column(String, default="monthly")  # monthly, quarterly, yearly
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=True)  # NULL for yearly budgets


# ── Exchange Rates (for multi-currency) ────────────────────────────────────

class ExchangeRate(Base):
    __tablename__ = "exchange_rates"

    id = Column(Integer, primary_key=True, index=True)
    from_currency = Column(SQLEnum(Currency), nullable=False)
    to_currency = Column(SQLEnum(Currency), nullable=False)
    rate = Column(Float, nullable=False)
    rate_date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
