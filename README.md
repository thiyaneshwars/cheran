# Cheran Co-operative Society Accounting Management System
**சேரன் கைத்தறி & விசைத்தறி நெசவாளர் கூட்டுறவு உற்பத்தி சங்கம் லிமிடெட்**  
*Reg. No. SL-204 (Under Tamil Nadu Co-operative Societies Act 1983)*  
*Chennimalai & Bhavani Main Road, Erode District - 638051*  
*Active Accounting Period: FY 2026-2027*

---

## 1. System Overview

A double-entry financial accounting system designed for textile co-operative societies in Tamil Nadu. The platform manages multi-bank treasury consolidation, section-wise operational ledgers, daily wage calculation, transport freight management, and statutory audit compliance.

### Key Architectural Pillars
- **Zero-Paise Rounding Discrepancy:** All calculations run on 20-digit Decimal.js fixed-point arithmetic.
- **Double-Entry Equilibrium:** Every transaction generates balanced debit/credit lines.
- **Single-Recognition Operating Expenses:** Wages and lorry freight are recognized as expenses upon accrual; subsequent bank disbursements strictly clear accrued liabilities without double-counting.
- **Traceable Reversals:** Transactions cannot be deleted; voiding generates counter-entries with mandatory reason logging for statutory audit trail inspection.
- **Consolidated Multi-Bank Treasury:** Aggregates separate accounts (SBI, Canara, HDFC) into a single consolidated liquid position.
- **Father-Friendly Bilingual Interface:** High-contrast light theme (Warm Ivory, Pure White, Deep Forest Teal, Soft Sage) with English primary and Tamil secondary subtitles, plus frontend font-scale preferences (Normal vs Large).

---

## 2. Core Functional Modules

1. **Financial Dashboard:** Real-time consolidated liquid bank balance, emotional profit/loss indicators reacting to live performance, key metrics, and operational section summaries.
2. **Bank Accounts & Treasury (with Liquid Cash):** Multi-bank ledger, passbook view, internal bank-to-bank transfers, 1-click reconciliation, and a dedicated **Liquid Cash & Petty Cash (கையிருப்பு ரொக்கம்)** section with real-time balance tracking, end-user cash updates, and 1-click revocation with audit trail.
3. **General Transactions (Daybook):** Complete journal vouchers ledger with search, filtering, line-item inspector, and traceable reversals.
4. **Sizing Bill Accounting:** Bill issuance, party ledgers, partial settlements, and outstanding balances.
5. **Powerloom Operations:** Loom production tracking (meters × rate), contract settlements, and payment vouchers.
6. **Daily Wage & Labor Ledger:** Gross wage calculation, advance deductions, net wages payable, and single-recognition disbursement vouchers.
7. **Transport Freight Ledger:** Vehicle and route tracking, freight bill recording, and transport liability settlements.
8. **Operational Profit & Loss:** Revenue aggregation, operating cost breakdown, net profit margin calculation, and printable statement.
9. **Statutory Reports:** Trial Balance, Section Ledgers, Bank Book, and official society letterhead with physical signature blocks.
10. **Users & Role Access:** Role-based permissions (Admin, Head Accountant, Entry Operator, Statutory Auditor, Management).
11. **Statutory Audit Trail:** Immutable, cryptographically timestamped action logs for regulatory inspection.
12. **Settings & Policies:** Society legal details, accounting integrity guarantees, font-size preference, and database backup guide.

---

## 3. Automated Accounting Validation (100% Pass)

All core accounting scenarios are covered by the automated test suite (`tests/accounting.test.ts`):

| Scenario | Objective | Verified Result |
|---|---|:---:|
| **Scenario 1** | Bank Aggregation | Bank A + Bank B + Bank C consolidated accurately | **PASS** |
| **Scenario 2** | Partial Settlement | Sizing bill settlement leaves accurate remaining receivable | **PASS** |
| **Scenario 3** | Wage Calculation | Net wages = Gross − Advances − Deductions | **PASS** |
| **Scenario 4** | Internal Transfer | Internal bank transfer preserves total consolidated balance | **PASS** |
| **Scenario 5** | Expense Settlement | Accrual recognizes expense; payment clears liability once | **PASS** |
| **Scenario 6** | Profit Margin | Net Profit = Turnover − Direct Costs − Operating Expenses | **PASS** |
| **Scenario 7** | Transaction Reversal | Traceable compensating entry restores balances perfectly | **PASS** |
| **Scenario 8** | Liquid Cash & Revoke | Cash In/Out/Adjustment with bank sync & 1-click revocation | **PASS** |

---

## 4. Production Deployment & Setup Commands

### Prerequisites
- Node.js v18+ (tested on Node v20/v22/v26)
- npm v10+

### Step-by-Step Production Deployment

```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Push database schema
npx prisma db push

# 3. Clean Production Database Setup (Zero Demo Data)
npm run seed:prod

# 4. Verify Code Quality & Test Suite
npm run lint
npm test

# 5. Build Production Bundle
npm run build

# 6. Start Production Server
npm start
# The production server will listen on http://localhost:3000
```

### Optional: Demonstration Seed (For Testing / Training)
If you wish to load sample demo records for staff training or evaluation:
```bash
npm run seed:demo
```
To return to a clean production database at any time:
```bash
npm run seed:prod
```

---

## 5. Official Society User Credentials

| Portal / Role | Official Credential | Default Password | Scope of Access |
|---|---|---|---|
| **Production Manager (உற்பத்தி துறை)** | `production@cheran` | `Society@2026` | **Production Dashboard**, **Veatti Section (வேட்டி பிரிவு)**, **Saree Section (சேலை பிரிவு)**, Paavu Allocation, Machine Loom tracking, and Govt Handover Tally. |
| **Auditing & Accounting (தணிக்கை & நிதிக்கணக்கு)** | `aduit@cheran` | `Society@2026` | Complete double-entry accounting suite, multi-bank treasury, daybook, passbooks, sizing bills, wage ledgers, 14 statutory reports, and cryptographic audit trail. *(Alias: `audit@cheran`)* |

> [!SECURITY NOTE]
> Legacy test accounts have been wiped. Only the official `production@cheran` and `aduit@cheran` credentials are active in the system. Change default passwords upon on-premises commissioning.

---

## 6. Backup & Recovery Protocol

The persistent database is saved as `dev.db` in the project root.

### Instantaneous Snapshot Backup
```powershell
# Create timestamped snapshot in backups directory
New-Item -ItemType Directory -Force -Path "backups"
Copy-Item "dev.db" -Destination "backups/dev_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').db"
```

### Restoration from Backup
```powershell
Copy-Item "backups/dev_backup_XYZ.db" -Destination "dev.db" -Force
```
