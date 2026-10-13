# CLINIC MANAGEMENT SYSTEM (CMS) - ACCOUNTANT MODULE SPECIFICATION

## 1. ROLE PROFILE & ACCESS SCOPE

- **Role Title**: Senior Financial & Billing Officer
- **Default Profile**: David Ross
- **Department**: Clinic Finance, Accounts & Revenue Billing
- **Access Level**: Invoicing, Fee Collection, Payment Reconciliation, Ledger Audits, and Financial Statements
- **Login Credentials**:
  - **Username**: `accountant`
  - **Email**: `accountant@beaconclinic.com` (or `d.ross@beaconclinic.com`)
  - **Password**: `Billing@123`
  - **Badge ID**: `ACC-601`
- **Core Clinical Responsibility**:
  Generate itemized medical invoices for outpatient consultations, laboratory investigations, and pharmacy dispensations, collect and reconcile patient payments across multiple payment channels, process insurance co-pays, track outstanding balances, and prepare clinic financial revenue audits.

---

## 2. MODULE ARCHITECTURE & SUB-MODULE BREAKDOWN

The Accountant workstation is organized into three financial modules:

### 2.1 Module 1: Billing Overview (`overview`)
The financial overview dashboard for clinic cash flow and accounts receivable.

- **Financial KPI Metrics**:
  - **Total Revenue Collected**: Cumulative gross fees settled and cleared across all clinic departments.
  - **Outstanding Balances**: Unpaid or partially settled receivables awaiting patient or insurer payment.
  - **Paid Invoices Count**: Total itemized accounts settled and confirmed with valid receipts.
  - **Pending Settlement**: Invoices issued but awaiting patient payment at the front desk or billing counter.
- **Departmental Revenue Breakdown**:
  - Outpatient Consultation Fees (Cardiology, General Practice)
  - Diagnostic Laboratory Pathology Fees
  - Pharmacy Dispensary Medication Sales
  - Nursing & Triage Intake Charges

---

### 2.2 Sub-Module 2: Invoices & Receipts (`invoices`)
The central invoice ledger and invoice generation engine.

- **Master Invoice Directory Table**:
  - **Invoice #**: Formatted accounting identifier (e.g., `INV-2026-001`, `INV-2026-002`).
  - **Patient**: Patient name and MRN reference.
  - **Issue Date**: Date of clinical service delivery.
  - **Itemized Services Breakdown**:
    - Item Description (e.g., "Cardiology Consultation - Dr. Marcus Vance", "Lipid Profile Diagnostic Assay", "Amlodipine Besylate 30 Days")
    - Quantity and Unit Price
    - Subtotal, Tax Amount, and Grand Total ($)
  - **Payment Status Badge**: `paid` (green), `pending` (rose), `partially_paid` (amber).
  - **Payment Method**: Settled via Cash, Card, Insurance, or UPI.
- **Action Control: "Create New Invoice" (Invoice Creator Modal)**:
  - **Patient Selector**: Select from registered clinic outpatients.
  - **Service Line Item Builder**: Add clinical consultation, lab, or medication charges with unit cost and quantity.
  - **Automated Total Calculator**: Computes subtotal, applies tax rate, and renders total due.
  - **"Issue Invoice" Action**: Posts the bill to the clinic accounts ledger and sends it to the patient portal.

---

### 2.3 Sub-Module 3: Fee Collections (`collections`)
Workstation for payment processing, multi-channel payment collection, and issuing receipts.

- **Pending Collections Queue**:
  - Filters strictly for invoices with status `pending` or `partially_paid`.
  - Highlights outstanding amounts requiring immediate front desk or counter collection.
- **Action Control: "Collect Payment" (Payment Collection Modal)**:
  - **Invoice Summary**: Displays invoice number, patient name, and total amount due.
  - **Payment Method Selector**:
    1. **Cash**: Cash tendered and change calculation.
    2. **Credit / Debit Card**: Terminal authorization with card reference number.
    3. **Health Insurance**: Insurer provider name and policy claim reference.
    4. **UPI / Direct Bank Transfer**: Instant QR / VPA transaction confirmation.
  - **Payment Notes**: Optional cashier remarks or insurance authorization numbers.
  - **"Confirm Payment & Settle Invoice" Action**:
    - Updates invoice status to `paid`.
    - Stamps payment method and settlement timestamp.
    - Generates a finalized receipt visible in the **Patient Portal** under "My Invoices".

---

## 3. DOMAIN DATA MODELS

```typescript
export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  patientId: string;
  patientName: string;
  date: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'paid' | 'pending' | 'partially_paid';
  paymentMethod?: 'cash' | 'credit_card' | 'insurance' | 'upi';
  notes?: string;
}
```

---

## 4. END-TO-END CROSS-ROLE WORKFLOW INTEGRATION

```
[Doctor Consultation] ────> ($150.00 Fee) ────────┐
                                                  │
[Lab Technician] ─────────> ($85.00 Lab Fee) ─────┼───> [Accountant Billing Desk]
                                                  │         • Generates Itemized Invoice
[Pharmacy Dispensary] ────> ($45.00 Rx Charge) ───┘         • Collects Payment (Cash/Card/UPI)
                                                            • Settle Bill
                                                                    │
                                                                    v
                                                            [Patient Portal]
                                                            Receipt visible immediately
                                                            with paid confirmation badge
```

1. **Clinical Service Aggregation -> Accountant**: When doctors complete consultations, pharmacists dispense medicines, or lab technicians complete tests, the accountant can consolidate these services into a single itemized patient bill.
2. **Payment Collection -> Patient Receipt**: Once the accountant collects payment, the patient's portal under "My Invoices" updates from `pending` to `paid` with a settled receipt stamp.
3. **Financial Reconciliation -> Clinic Admin**: Settled payments immediately update the Clinic Admin's revenue KPI cards and monthly financial summaries.

---

## 5. FINANCIAL AUDIT & REVENUE INTEGRITY

- **Immutable Financial Records**: Settled invoices cannot be altered without an audit trail, preserving financial integrity.
- **Multiple Payment Channels**: Accommodates diverse patient payment preferences (Cash, Card, Insurer Claim, UPI).
- **Transparency**: Fully itemized billing breakdowns eliminate billing ambiguities for patients and insurers.

