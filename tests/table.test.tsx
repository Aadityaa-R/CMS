import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Table, ColumnDef, HIDE_BELOW_CLASSES } from '../src/components/ui/Table';

interface TestRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

const testColumns: ColumnDef<TestRecord>[] = [
  { key: 'name', header: 'Name', label: 'Full Name', isPrimary: true },
  { key: 'email', header: 'Email', label: 'Email Address', hideBelow: 'sm' },
  { key: 'role', header: 'Role', label: 'Assigned Role', hideBelow: 'md' },
  { key: 'status', header: 'Status', hideBelow: 'lg' },
  { key: 'actions', header: 'Actions', isActions: true, render: () => <button>View</button> },
];

const testData: TestRecord[] = [
  { id: '1', name: 'Alice Smith', email: 'alice@example.com', role: 'Doctor', status: 'Active' },
  { id: '2', name: 'Bob Jones', email: 'bob@example.com', role: 'Receptionist', status: 'Active' },
];

describe('Shared Responsive Table Component (M9.5 Requirement H)', () => {
  it('renders correct header and cell counts matching columns and data rows', () => {
    const { container } = render(
      <Table columns={testColumns} data={testData} keyExtractor={(it) => it.id} />
    );

    const headers = container.querySelectorAll('th');
    expect(headers.length).toBe(testColumns.length);

    const cells = container.querySelectorAll('td');
    expect(cells.length).toBe(testColumns.length * testData.length);

    // Verify row count in body
    const rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBe(testData.length);
  });

  it('applies responsive hideBelow classes to headers and cells synchronously', () => {
    const { container } = render(
      <Table columns={testColumns} data={testData} keyExtractor={(it) => it.id} />
    );

    // Email column (hideBelow: 'sm')
    const emailHeader = container.querySelectorAll('th')[1];
    expect(emailHeader.className).toContain('hidden sm:table-cell');

    const emailCellRow1 = container.querySelectorAll('tr')[1].querySelectorAll('td')[1];
    expect(emailCellRow1.className).toContain('hidden sm:table-cell');

    // Role column (hideBelow: 'md')
    const roleHeader = container.querySelectorAll('th')[2];
    expect(roleHeader.className).toContain('hidden md:table-cell');

    const roleCellRow1 = container.querySelectorAll('tr')[1].querySelectorAll('td')[2];
    expect(roleCellRow1.className).toContain('hidden md:table-cell');

    // Status column (hideBelow: 'lg')
    const statusHeader = container.querySelectorAll('th')[3];
    expect(statusHeader.className).toContain('hidden lg:table-cell');

    const statusCellRow1 = container.querySelectorAll('tr')[1].querySelectorAll('td')[3];
    expect(statusCellRow1.className).toContain('hidden lg:table-cell');
  });

  it('renders data label in stacked mode matching column label or header', () => {
    const { container } = render(
      <Table columns={testColumns} data={testData} keyExtractor={(it) => it.id} />
    );

    // Row 1 Email cell has custom label "Email Address"
    const emailCell = container.querySelectorAll('tr')[1].querySelectorAll('td')[1];
    const emailLabelSpan = emailCell.querySelector('span');
    expect(emailLabelSpan).not.toBeNull();
    expect(emailLabelSpan?.textContent).toBe('Email Address');

    // Row 1 Role cell has custom label "Assigned Role"
    const roleCell = container.querySelectorAll('tr')[1].querySelectorAll('td')[2];
    const roleLabelSpan = roleCell.querySelector('span');
    expect(roleLabelSpan).not.toBeNull();
    expect(roleLabelSpan?.textContent).toBe('Assigned Role');

    // Row 1 Status cell has no explicit label property, falls back to header "Status"
    const statusCell = container.querySelectorAll('tr')[1].querySelectorAll('td')[3];
    const statusLabelSpan = statusCell.querySelector('span');
    expect(statusLabelSpan).not.toBeNull();
    expect(statusLabelSpan?.textContent).toBe('Status');
  });

  it('renders primary column with bold prominence and actions column with touch target wrapper', () => {
    const { container } = render(
      <Table columns={testColumns} data={testData} keyExtractor={(it) => it.id} />
    );

    // Primary column (Name) should have font-bold
    const nameCell = container.querySelectorAll('tr')[1].querySelectorAll('td')[0];
    const primaryDiv = nameCell.querySelector('div');
    expect(primaryDiv?.className).toContain('font-bold');
    expect(primaryDiv?.textContent).toBe('Alice Smith');

    // Actions column should have flex wrap button container
    const actionsCell = container.querySelectorAll('tr')[1].querySelectorAll('td')[4];
    const actionWrapper = actionsCell.querySelector('div');
    expect(actionWrapper?.className).toContain('flex flex-wrap items-center');
    expect(actionsCell.querySelector('button')).not.toBeNull();
  });

  it('verifies HIDE_BELOW_CLASSES map integrity', () => {
    expect(HIDE_BELOW_CLASSES.sm).toBe('hidden sm:table-cell');
    expect(HIDE_BELOW_CLASSES.md).toBe('hidden md:table-cell');
    expect(HIDE_BELOW_CLASSES.lg).toBe('hidden lg:table-cell');
    expect(HIDE_BELOW_CLASSES.xl).toBe('hidden xl:table-cell');
  });
});
