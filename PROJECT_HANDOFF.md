# CLINIC MANAGEMENT SYSTEM (CMS) - PROJECT HANDOFF & CONTINUATION SPECIFICATION

## 1. PROJECT OVERVIEW & CORE CONSTRAINTS

- **Project Name**: Clinic Management System (CMS)
- **Meaning of CMS**: Clinic Management System (NOT Content Management System)
- **Project Directory**: `c:\Users\raadi\Downloads\CMS`
- **Git Repository**: Local offline repository (`main` branch). Do NOT push to remote Git until explicitly requested by user.
- **Development Strategy**: **Frontend First**. The user specifically instructed to build and refine the complete, responsive frontend web application with realistic interactive state and mock datasets first, before building any backend or databases.
- **Strict Emoji Rule**: **DO NOT USE EMOJIS UNDER ANY CIRCUMSTANCES**. Zero emojis in assistant messages, role titles, and UI code unless explicitly requested and approved by the user.
- **Roles in Scope**: Exactly **5 roles**:
  1. Admin (formerly Clinic Admin)
  2. Doctor
  3. Patient
  4. Receptionist
  5. Laboratory Technician

---

## 2. ROADMAP & ARCHITECTURAL PILLARS

1. **Pillar 1: Modern Frontend Architecture & Project Setup** (Completed)
   - Vite 6 + React 18 + TypeScript 5 + Tailwind CSS 3 + Lucide React.
   - Clean production build verified (`tsc && vite build` with 0 errors).
2. **Pillar 2: Clinical Domain Modeling & Type Definitions** (Completed)
   - Comprehensive TypeScript models in `src/types/index.ts` covering all 5 roles, patients, vitals, appointments, e-prescriptions, lab tests, invoices, and inventory.
3. **Pillar 3: Role Engine, Authentication & Reactive State** (Completed)
   - `AuthContext.tsx` with instant 1-click role switcher between all 5 roles.
   - `ClinicContext.tsx` providing full interactive CRUD state for all medical modules.
   - `mockData.ts` with interconnected realistic clinical data.
4. **Pillar 4: Medical UI Component System & Design Language** (Completed)
   - Reusable components: Button, Card, Badge, StatCard, Modal, Input, Select.
   - Clinical color theme: calm teal, clinical blue, slate gray, white.
5. **Pillar 5: Role-Specific Clinical Dashboards & Workstations** (Completed)
   - Complete functional views for all 5 roles + professional Login page.
6. **Pillar 6: End-to-End Inter-Role Workflow Integration** (Ready for Next Steps / Deep Refinement)
   - Cross-role workflows: Receptionist check-in -> Doctor consultation & prescriptions -> Lab processing -> Administration billing & inventory.
7. **Pillar 7: Testing, Responsiveness & Verification** (Ready for Next Steps)
   - Edge case validation, mobile navigation testing, and responsive UI polish.

---

## 3. FILE SYSTEM & CODEBASE STRUCTURE

```
c:\Users\raadi\Downloads\CMS\
├── .gitignore                      # Configured to ignore node_modules, dist, logs, etc.
├── package.json                    # React 18, Vite 6, Tailwind CSS 3, Lucide React, TypeScript 5
├── package-lock.json
├── index.html                      # Clean clinical entry with Inter font
├── vite.config.ts                  # Vite config with '@/' path alias to 'src/'
├── tsconfig.json                   # Strict TypeScript compiler options with bundler resolution
├── tsconfig.node.json
├── tailwind.config.js              # Clinic color palette extensions (teal, slate, emerald, amber, rose)
├── postcss.config.js               # Tailwind & Autoprefixer
├── src/
│   ├── main.tsx                    # React DOM client entry
│   ├── App.tsx                     # Top-level wrapper for AuthProvider and ClinicProvider
│   ├── index.css                   # Tailwind directives and clean scrollbar styling
│   ├── types/
│   │   └── index.ts                # Strict domain interfaces for all 8 roles and medical modules
│   ├── data/
│   │   └── mockData.ts             # Interconnected clinical demo dataset for all 8 roles
│   ├── context/
│   │   ├── AuthContext.tsx         # User authentication, active role, 1-click role switcher
│   │   └── ClinicContext.tsx       # State management for patients, appointments, vitals, rx, lab, billing, inventory
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx          # Primary, secondary, outline, danger, soft, loading state
│   │   │   ├── Card.tsx            # Card, Header, Title, Description, Content
│   │   │   ├── Badge.tsx           # Success, warning, danger, info, neutral, teal
│   │   │   ├── StatCard.tsx        # KPI metrics with icon and trend
│   │   │   ├── Modal.tsx           # Accessible dialog with backdrop and escape key handling
│   │   │   ├── Input.tsx           # Form text inputs with labels and helper text
│   │   │   └── Select.tsx          # Dropdown selectors with labels
│   │   └── layout/
│   │       ├── AppLayout.tsx       # Main layout shell connecting top bar, sidebar, and view container
│   │       ├── Navbar.tsx          # Header with clinic branding, search, notifications, profile
│   │       ├── Sidebar.tsx         # Dynamic role-specific navigation sidebar
│   │       └── RoleSwitcher.tsx    # 1-click developer toolbar allowing instant switching between all 5 roles
│   └── views/
│       ├── ClinicAdminView.tsx     # Executive KPIs, patient directory, doctors, master calendar, billing & inventory
│       ├── DoctorView.tsx          # Queue, triage vitals review, allergy warnings, e-Rx writer, lab test ordering
│       ├── PatientView.tsx         # Eleanor Wright's portal (appointments, prescriptions, lab results, bills, booking modal)
│       ├── ReceptionistView.tsx    # Waiting lounge, 1-click check-in, token issuing, patient registration, walk-ins
│       ├── LabTechnicianView.tsx   # Pathology worklist, sample collection, STAT priority, diagnostic results certification
│       └── LoginView.tsx           # Clean common login screen with 1-click demo role selector
```

---

## 4. CURRENT STATUS & VERIFICATION

- **Build Verification**:
  - Command: `npm run build` (`tsc && vite build`)
  - Status: Succeeded with **0 errors**.
- **Working Tree**: Maintained locally.
- **Running the Application**:
  ```bash
  cd "c:\Users\raadi\Downloads\CMS"
  npm run dev
  ```
  Launches the Vite development server on `http://localhost:3000`.

---

## 5. INSTRUCTIONS FOR THE NEXT AI ASSISTANT / CHAT

When continuing work in the new chat:
1. **Honor the constraints**:
   - Zero emojis in all outputs and code.
   - 5 roles only: Admin, Doctor, Patient, Receptionist, Laboratory Technician.
   - Frontend first (do not write backend code or database migrations until instructed).
   - Offline local repo in `c:\Users\raadi\Downloads\CMS`.
2. **Where to resume**:
   - The foundation, domain models, state providers, and all 5 role views are fully created and compiling.
   - Proceed with inter-role workflows, UI polish, responsive tablet/mobile behaviors, and advanced filtering/search features.

