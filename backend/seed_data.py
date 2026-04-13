"""Seed the database with default categories and example jurisdictions."""
from sqlalchemy.orm import Session
from models import Category, Jurisdiction, TaxRule, TransferType


DEFAULT_CATEGORIES = [
    {"name": "Miete & Wohnen", "icon": "🏠", "color": "#EF4444", "keywords": ["miete", "rent", "wohnung", "strom", "gas", "internet", "telefon"]},
    {"name": "Lebensmittel", "icon": "🛒", "color": "#F59E0B", "keywords": ["rewe", "edeka", "lidl", "aldi", "supermarkt", "grocery"]},
    {"name": "Transport", "icon": "🚗", "color": "#3B82F6", "keywords": ["uber", "taxi", "benzin", "fuel", "bahn", "bus", "flug", "flight"]},
    {"name": "Restaurants & Bars", "icon": "🍽️", "color": "#EC4899", "keywords": ["restaurant", "cafe", "bar", "lieferando", "uber eats"]},
    {"name": "Shopping", "icon": "🛍️", "color": "#8B5CF6", "keywords": ["amazon", "zalando", "h&m", "zara"]},
    {"name": "Gesundheit", "icon": "🏥", "color": "#10B981", "keywords": ["apotheke", "arzt", "doctor", "pharmacy", "krankenversicherung"]},
    {"name": "Versicherungen", "icon": "🛡️", "color": "#6366F1", "keywords": ["versicherung", "insurance", "haftpflicht"]},
    {"name": "Abonnements", "icon": "📱", "color": "#F97316", "keywords": ["netflix", "spotify", "apple", "google", "subscription"]},
    {"name": "Bildung", "icon": "📚", "color": "#14B8A6", "keywords": ["kurs", "course", "buch", "book", "training"]},
    {"name": "Unterhaltung", "icon": "🎮", "color": "#D946EF", "keywords": ["kino", "cinema", "sport", "gym", "fitness"]},
    {"name": "Gehalt", "icon": "💰", "color": "#22C55E", "keywords": ["gehalt", "salary", "lohn", "wage"]},
    {"name": "Freelance/Beratung", "icon": "💼", "color": "#0EA5E9", "keywords": ["invoice", "rechnung", "beratung", "consulting"]},
    {"name": "Dividende", "icon": "📈", "color": "#A3E635", "keywords": ["dividend", "dividende", "ausschüttung"]},
    {"name": "Kapitalertrag", "icon": "📊", "color": "#84CC16", "keywords": ["zinsen", "interest", "kapitalertrag", "rendite"]},
    {"name": "Steuern", "icon": "🏛️", "color": "#DC2626", "keywords": ["steuer", "tax", "finanzamt"]},
    {"name": "Software & Tools", "icon": "💻", "color": "#7C3AED", "keywords": ["saas", "software", "tool", "hosting", "server", "cloud"]},
    {"name": "Marketing", "icon": "📢", "color": "#E11D48", "keywords": ["ads", "werbung", "marketing", "facebook", "google ads"]},
    {"name": "Büro & Equipment", "icon": "🖥️", "color": "#0891B2", "keywords": ["büro", "office", "equipment", "möbel"]},
    {"name": "Sonstiges", "icon": "📋", "color": "#6B7280", "keywords": []},
]


DEFAULT_JURISDICTIONS = [
    {
        "name": "Cyprus",
        "country_code": "CY",
        "corporate_tax_rate": 0.125,
        "personal_income_tax_rate": 0.0,
        "dividend_withholding_tax": 0.0,
        "vat_rate": 0.19,
        "notes": "12.5% Corporate Tax. No withholding on dividends to non-resident shareholders. IP Box regime available (effective 2.5%).",
    },
    {
        "name": "UAE / Dubai",
        "country_code": "AE",
        "corporate_tax_rate": 0.09,
        "personal_income_tax_rate": 0.0,
        "dividend_withholding_tax": 0.0,
        "vat_rate": 0.05,
        "notes": "0% personal income tax. 9% corporate tax on profits > AED 375k (since June 2023). Free zones may have 0% corp tax.",
    },
    {
        "name": "Deutschland",
        "country_code": "DE",
        "corporate_tax_rate": 0.30,
        "personal_income_tax_rate": 0.42,
        "dividend_withholding_tax": 0.2638,
        "vat_rate": 0.19,
        "notes": "~30% effective corporate tax (KSt + GewSt + Soli). 26.38% Abgeltungssteuer on dividends.",
    },
    {
        "name": "Estonia",
        "country_code": "EE",
        "corporate_tax_rate": 0.0,
        "personal_income_tax_rate": 0.20,
        "dividend_withholding_tax": 0.20,
        "vat_rate": 0.22,
        "notes": "0% corp tax on retained profits. 20/80 tax on distributed profits (effective 20%). 14/86 for regular distributions.",
    },
    {
        "name": "UK",
        "country_code": "GB",
        "corporate_tax_rate": 0.25,
        "personal_income_tax_rate": 0.45,
        "dividend_withholding_tax": 0.0,
        "vat_rate": 0.20,
        "notes": "25% corp tax on profits >250k. Small profits rate 19%. No dividend WHT.",
    },
    {
        "name": "Schweiz",
        "country_code": "CH",
        "corporate_tax_rate": 0.15,
        "personal_income_tax_rate": 0.115,
        "dividend_withholding_tax": 0.35,
        "vat_rate": 0.081,
        "notes": "~15% eff. Corp Tax (Bund + Kanton, variiert). 35% Verrechnungssteuer auf Dividenden (rückforderbar bei DBA). PIT variiert je Kanton (8-11.5% Bund).",
    },
    {
        "name": "BVI",
        "country_code": "VG",
        "corporate_tax_rate": 0.0,
        "personal_income_tax_rate": 0.0,
        "dividend_withholding_tax": 0.0,
        "vat_rate": 0.0,
        "notes": "0% Corp Tax, 0% PIT, 0% WHT, keine MwSt. Klassische Offshore-Jurisdiktion. Kein CRS-Austausch auf Unternehmensebene.",
    },
    {
        "name": "Singapur",
        "country_code": "SG",
        "corporate_tax_rate": 0.17,
        "personal_income_tax_rate": 0.22,
        "dividend_withholding_tax": 0.0,
        "vat_rate": 0.09,
        "notes": "17% Corp Tax (Teilfreistellungen für erste 300k SGD). 0% WHT auf Dividenden (one-tier system). GST 9%.",
    },
    {
        "name": "Panama",
        "country_code": "PA",
        "corporate_tax_rate": 0.25,
        "personal_income_tax_rate": 0.25,
        "dividend_withholding_tax": 0.10,
        "vat_rate": 0.07,
        "notes": "25% Corp Tax. Territorial system: nur lokales Einkommen besteuert. 10% WHT auf lokale Dividenden (5% für börsennotiert). ITBMS 7%.",
    },
]


def seed_database(db: Session):
    """Seed with defaults if tables are empty."""
    if db.query(Category).count() == 0:
        for cat_data in DEFAULT_CATEGORIES:
            db.add(Category(**cat_data))
        db.commit()

    if db.query(Jurisdiction).count() == 0:
        for j_data in DEFAULT_JURISDICTIONS:
            j = Jurisdiction(**j_data)
            db.add(j)
        db.commit()

        # Add default tax rules
        jurisdictions = {j.name: j for j in db.query(Jurisdiction).all()}

        default_rules = [
            # Cyprus
            (jurisdictions["Cyprus"].id, TransferType.DIVIDEND, 0.0, "No WHT on dividends to non-residents"),
            (jurisdictions["Cyprus"].id, TransferType.SALARY, 0.0, "No personal income tax for non-domiciled"),
            (jurisdictions["Cyprus"].id, TransferType.MANAGEMENT_FEE, 0.125, "Deductible at company level, taxed as corp income if received by CY entity"),
            # UAE
            (jurisdictions["UAE / Dubai"].id, TransferType.DIVIDEND, 0.0, "No WHT on dividends"),
            (jurisdictions["UAE / Dubai"].id, TransferType.SALARY, 0.0, "No personal income tax"),
            (jurisdictions["UAE / Dubai"].id, TransferType.LOAN, 0.0, "No tax on loan disbursements"),
            # Germany
            (jurisdictions["Deutschland"].id, TransferType.DIVIDEND, 0.2638, "Abgeltungssteuer 26.375% + Soli"),
            (jurisdictions["Deutschland"].id, TransferType.SALARY, 0.42, "Top marginal rate 42%"),
            # Schweiz
            (jurisdictions["Schweiz"].id, TransferType.DIVIDEND, 0.35, "35% Verrechnungssteuer (r\u00fcckforderbar bei DBA)"),
            (jurisdictions["Schweiz"].id, TransferType.SALARY, 0.115, "Direkte Bundessteuer max. 11.5%, zzgl. Kantonssteuer"),
            (jurisdictions["Schweiz"].id, TransferType.MANAGEMENT_FEE, 0.15, "WHT auf Management Fees an Ausland ~15% (DBA-abh\u00e4ngig)"),
            # BVI
            (jurisdictions["BVI"].id, TransferType.DIVIDEND, 0.0, "No WHT on dividends"),
            (jurisdictions["BVI"].id, TransferType.SALARY, 0.0, "No personal income tax"),
            (jurisdictions["BVI"].id, TransferType.MANAGEMENT_FEE, 0.0, "No withholding on fees"),
            # Singapur
            (jurisdictions["Singapur"].id, TransferType.DIVIDEND, 0.0, "No WHT on dividends (one-tier system)"),
            (jurisdictions["Singapur"].id, TransferType.SALARY, 0.22, "Top marginal rate 22% \u00fcber 320k SGD"),
            (jurisdictions["Singapur"].id, TransferType.MANAGEMENT_FEE, 0.17, "WHT on management fees to non-residents 17%"),
            # Panama
            (jurisdictions["Panama"].id, TransferType.DIVIDEND, 0.10, "10% WHT auf Dividenden (5% f\u00fcr SA)"),
            (jurisdictions["Panama"].id, TransferType.SALARY, 0.0, "Foreign-source income steuerfrei (Territorial)"),
            (jurisdictions["Panama"].id, TransferType.MANAGEMENT_FEE, 0.125, "12.5% WHT auf Fees an Ausland"),
        ]

        for jid, ttype, rate, desc in default_rules:
            db.add(TaxRule(jurisdiction_id=jid, transfer_type=ttype, tax_rate=rate, description=desc))
        db.commit()

    print("\u2713 Database seeded successfully")
