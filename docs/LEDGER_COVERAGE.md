# Security Audit Ledger Coverage Matrix

## Overview
The Clinic Management System (CMS) maintains an append-only security audit ledger that permanently records every state-changing action across clinical consultations, patient administration, scheduling, financial transactions, staff governance, access control, and system storage operations.

The ledger is persisted under the browser repository collection `ledger` and is rendered in real time within the Administrative Console under the Security Audit Ledger tab with searchable action filtering.

---

## Action Coverage Matrix

| Action Name | Primary Actor | Target Entity | Core Payload Fields | Tested |
| :--- | :--- | :--- | :--- | :--- |
| `user_login` | Authenticating Staff / Patient | Account (`account.id`) | `id`, `timestamp`, `action`, `targetRole`, `targetStaffName`, `targetUserId`, `description`, `authorizedBy` | Yes |
| `account_locked` | System Security Watchdog | Account (`account.id`) | `id`, `timestamp`, `action`, `targetRole`, `targetStaffName`, `targetUserId`, `description`, `authorizedBy` | Yes |
| `password_reset` | Authenticated User / Administrator | Account (`currentUser.name`) | `id`, `timestamp`, `action`, `subject`, `role`, `details`, `authorizedBy` | Yes |
| `patient_self_registered` | Patient (Online Sign-Up) | New Patient Account | `id`, `timestamp`, `action`, `targetRole`, `targetStaffName`, `targetUserId`, `description`, `authorizedBy` | Yes |
| `staff_clearance_requested` | Staff Candidate (Sign-Up) | Candidate Record | `id`, `timestamp`, `action`, `targetRole`, `targetStaffName`, `targetUserId`, `description`, `authorizedBy` | Yes |
| `patient_registered` | Receptionist / Admin | Outpatient Demographics | `id`, `timestamp`, `action`, `targetRole`, `targetStaffName`, `targetUserId`, `description`, `authorizedBy` | Yes |
| `patient_checked_in` | Receptionist / Admin | Appointment (`apt.id`) | `id`, `timestamp`, `action`, `targetUserId`, `targetStaffName`, `description`, `authorizedBy` | Yes |
| `walkin_checked_in` | Receptionist / Admin | Walk-in Appointment (`apt.id`) | `id`, `timestamp`, `action`, `targetUserId`, `targetStaffName`, `description`, `authorizedBy` | Yes |
| `vitals_recorded` | Consulting Physician / Intake Staff | Patient Vitals Record | `id`, `timestamp`, `action`, `targetUserId`, `description`, `authorizedBy` | Yes |
| `consultation_started` | Consulting Physician | Appointment (`apt.id`) | `id`, `timestamp`, `action`, `targetUserId`, `targetStaffName`, `description`, `authorizedBy` | Yes |
| `consultation_concluded` | Consulting Physician | Appointment (`apt.id`) | `id`, `timestamp`, `action`, `targetUserId`, `targetStaffName`, `description`, `authorizedBy` | Yes |
| `care_transferred` | Consulting Physician / Admin | Assigned Patient Care | `id`, `timestamp`, `action`, `targetUserId`, `targetStaffName`, `description`, `authorizedBy` | Yes |
| `patient_assigned` | Receptionist / Admin | Initial Physician Assignment | `id`, `timestamp`, `action`, `targetUserId`, `targetStaffName`, `description`, `authorizedBy` | Yes |
| `prescription_issued` | Attending Physician | Prescription (`prescription.id`) | `id`, `timestamp`, `action`, `targetRole`, `targetUserId`, `targetStaffName`, `description`, `authorizedBy` | Yes |
| `allergy_override` | Prescribing Physician | Clinical Override Record | `id`, `timestamp`, `action`, `targetRole`, `targetUserId`, `targetStaffName`, `description`, `authorizedBy` | Yes |
| `prescription_cancelled` | Issuing Physician / Admin | Prescription (`prescription.id`) | `id`, `timestamp`, `action`, `targetRole`, `targetUserId`, `targetStaffName`, `description`, `authorizedBy` | Yes |
| `invoice_issued` | System / Billing Operator | Clinical Invoice (`invoice.id`) | `id`, `timestamp`, `action`, `targetUserId`, `targetStaffName`, `description`, `authorizedBy` | Yes |
| `charge_added` | Receptionist / Billing Staff | Invoice Charge Item | `id`, `timestamp`, `action`, `subject`, `role`, `details`, `authorizedBy` | Yes |
| `discount_applied` | Administrator | Invoice Balance Discount | `id`, `timestamp`, `action`, `subject`, `role`, `details`, `authorizedBy` | Yes |
| `payment_recorded` | Cashier / Receptionist | Invoice Payment Settlement | `id`, `timestamp`, `action`, `subject`, `role`, `details`, `authorizedBy` | Yes |
| `portal_payment` | Patient (Self-Service) | Invoice Payment Settlement | `id`, `timestamp`, `action`, `subject`, `role`, `details`, `authorizedBy` | Yes |
| `payment_reversed` | Administrator | Payment Transaction | `id`, `timestamp`, `action`, `subject`, `role`, `details`, `authorizedBy` | Yes |
| `invoice_voided` | Administrator | Unpaid Invoice | `id`, `timestamp`, `action`, `subject`, `role`, `details`, `authorizedBy` | Yes |
| `attendance_clock_in` | Staff Member | Daily Shift Log | `id`, `timestamp`, `action`, `targetRole`, `targetStaffName`, `targetUserId`, `description`, `authorizedBy` | Yes |
| `attendance_clock_in_override` | Administrator | Daily Shift Override Log | `id`, `timestamp`, `action`, `targetRole`, `targetStaffName`, `targetUserId`, `description`, `authorizedBy` | Yes |
| `attendance_clock_out` | Staff Member | Daily Shift Log | `id`, `timestamp`, `action`, `targetRole`, `targetStaffName`, `targetUserId`, `description`, `authorizedBy` | Yes |
| `leave_requested` | Staff Member | Leave Request (`leave.id`) | `id`, `timestamp`, `action`, `targetRole`, `targetStaffName`, `targetUserId`, `description`, `authorizedBy` | Yes |
| `leave_approved` | Administrator | Leave Request (`leave.id`) | `id`, `timestamp`, `action`, `targetRole`, `targetStaffName`, `targetUserId`, `description`, `authorizedBy` | Yes |
| `leave_rejected` | Administrator | Leave Request (`leave.id`) | `id`, `timestamp`, `action`, `targetRole`, `targetStaffName`, `targetUserId`, `description`, `authorizedBy` | Yes |
| `attendance_record_corrected` | Administrator | Attendance Audit Record | `id`, `timestamp`, `action`, `targetRole`, `targetStaffName`, `targetUserId`, `description`, `authorizedBy` | Yes |
| `shift_updated` | Administrator | Shift Schedule Configuration | `id`, `timestamp`, `action`, `targetRole`, `targetStaffName`, `targetUserId`, `description`, `authorizedBy` | Yes |
| `module_created` | Administrator | Governance Role Module | `id`, `timestamp`, `action`, `targetRole`, `targetStaffName`, `targetUserId`, `description`, `authorizedBy` | Yes |
| `module_renamed` | Administrator | Governance Role Module | `id`, `timestamp`, `action`, `targetRole`, `targetStaffName`, `targetUserId`, `description`, `authorizedBy` | Yes |
| `module_deleted` | Administrator | Governance Role Module | `id`, `timestamp`, `action`, `targetRole`, `targetStaffName`, `targetUserId`, `description`, `authorizedBy` | Yes |
| `module_access_included` | Administrator | Module Privilege Association | `id`, `timestamp`, `action`, `targetRole`, `targetStaffName`, `targetUserId`, `description`, `authorizedBy` | Yes |
| `module_access_removed` | Administrator | Module Privilege Disassociation | `id`, `timestamp`, `action`, `targetRole`, `targetStaffName`, `targetUserId`, `description`, `authorizedBy` | Yes |
| `module_member_added` | Administrator | Staff Module Membership | `id`, `timestamp`, `action`, `targetRole`, `targetStaffName`, `targetUserId`, `description`, `authorizedBy` | Yes |
| `module_member_removed` | Administrator | Staff Module Membership | `id`, `timestamp`, `action`, `targetRole`, `targetStaffName`, `targetUserId`, `description`, `authorizedBy` | Yes |
| `account_provisioned` | Administrator | New Staff Account Credentials | `id`, `timestamp`, `action`, `targetRole`, `targetStaffName`, `targetUserId`, `description`, `authorizedBy` | Yes |
| `clearance_approved` | Managing Director | Pending Onboarding Request | `id`, `timestamp`, `action`, `targetRole`, `targetStaffName`, `targetUserId`, `description`, `authorizedBy` | Yes |
| `clearance_rejected` | Managing Director | Pending Onboarding Request | `id`, `timestamp`, `action`, `targetRole`, `targetStaffName`, `targetUserId`, `description`, `authorizedBy` | Yes |
| `account_deleted` | Managing Director | Staff Account Credentials | `id`, `timestamp`, `action`, `targetRole`, `targetStaffName`, `targetUserId`, `description`, `authorizedBy` | Yes |
| `storage_mode_changed` | Administrator | Storage Persistence Layer | `id`, `timestamp`, `action`, `targetRole`, `targetStaffName`, `targetUserId`, `description`, `authorizedBy` | Yes |
| `data_exported` | Administrator | System Backup File | `id`, `timestamp`, `action`, `targetRole`, `targetStaffName`, `targetUserId`, `description`, `authorizedBy` | Yes |
| `data_imported` | Administrator | System Backup Archive | `id`, `timestamp`, `action`, `subject`, `role`, `details`, `authorizedBy` | Yes |
| `data_restored_undo` | Administrator | Snapshot Restore Engine | `id`, `timestamp`, `action`, `targetRole`, `targetStaffName`, `targetUserId`, `description`, `authorizedBy` | Yes |
| `demo_data_reset` | Managing Director | Demonstration Seed Baseline | `id`, `timestamp`, `action`, `subject`, `role`, `details`, `authorizedBy` | Yes |

---

## Audit Record Schema

Each entry written to the ledger complies with the standard `AccessAuditLogEntry` interface:

- `id` (string, required): Unique identifier prefixed with `audit-<timestamp>-<random>`.
- `timestamp` (string, ISO 8601, required): UTC timestamp representing the exact moment the mutation was executed.
- `action` (string, required): Semantic action identifier from the registered action catalog.
- `authorizedBy` (string, required): Full name and role of the operating actor authorizing the event.
- `targetRole` (string, optional): Role designation of the impacted user or system resource.
- `targetStaffName` (string, optional): Full name of the impacted staff member or patient.
- `targetUserId` (string, optional): Canonical identifier of the impacted user or patient MRN.
- `description` / `details` (string, optional): Clinical or administrative summary text explaining the operation, including parameters and clinical rationale.
