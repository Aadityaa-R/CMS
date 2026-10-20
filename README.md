# Beacon Health Clinic Management System

Beacon Health Clinic Management System (CMS) is an outpatient clinical and administrative operations platform engineered for modern healthcare facilities. It coordinates the complete patient lifecycle—from front desk arrival triage, demographics-only registration, and token queue management, through consulting physician workstation encounters with triage vitals, formulary-backed electronic prescribing, and allergen cross-checks, to minor-unit fee billing, point-of-sale collections, staff shift attendance, and granular module-derived access governance—ensuring end-to-end data integrity and strict clinical safety standards across every interaction.

## Environment and Stack Specifications

- **Technology Stack**: React 18, TypeScript 5, Vite 6, Tailwind CSS, Lucide React, and Vitest.
- **Node Version**: Node.js v20.x or higher (Node.js v22 recommended).
- **Default Port**: Port 3000 (`http://localhost:3000`).

## Operational Commands

### Development Server
```powershell
npm run dev
```
Launches the local development server at `http://localhost:3000`.

### Production Build
```powershell
npm run build
```
Executes TypeScript compilation (`tsc`) and Vite production bundling into `dist/`.

### TypeScript Verification
```powershell
npm run typecheck
```
Executes complete strict type checking across all application source files, test suites, and automation scripts with zero errors.

### Automated Testing Suite
```powershell
npm test
```
Executes the full Vitest suite (196 tests across 21 test files) covering authentication, scheduling, permissions, billing, e-prescribing, keyboard navigation, and business invariants.

### Multi-Timezone and Security Verification
```powershell
npm run verify
```
Runs the mandatory quality gate executing production build, typecheck, multi-timezone test runner across UTC, America/Los_Angeles, and Asia/Kolkata, AST emoji scanner, git commit message audit, and token color scanner.

## Documentation and Visual Assets

- **Project Specification and Rules**: [PROJECT_SPECIFICATION_AND_RULES.md](file:///c:/Users/raadi/Downloads/CMS/PROJECT_SPECIFICATION_AND_RULES.md)
- **Demonstration Walkthrough Guide**: [docs/DEMO_GUIDE.md](file:///c:/Users/raadi/Downloads/CMS/docs/DEMO_GUIDE.md)
- **Security Audit Ledger Matrix**: [docs/LEDGER_COVERAGE.md](file:///c:/Users/raadi/Downloads/CMS/docs/LEDGER_COVERAGE.md)
- **Full-Screen Responsive Screenshots**: [docs/final-screens/](file:///c:/Users/raadi/Downloads/CMS/docs/final-screens/)
