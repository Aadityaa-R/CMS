import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { DetailList, DetailItem, DetailGrid } from '../src/components/ui/DetailList';
import { Table, ColumnDef, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../src/components/ui/Table';
import { PageContainer } from '../src/components/layout/PageContainer';
import { formatDate, formatTime } from '../src/lib/time';

describe('Layout Uniformity - M10.4 Requirements', () => {
  describe('PageContainer Component', () => {
    it('renders with max-width token --page-max centered with margin auto', () => {
      const { container } = render(
        <PageContainer data-testid="page-container">
          <div>Content</div>
        </PageContainer>
      );
      const el = (container.querySelector('[data-testid="page-container"]') || container.firstChild) as HTMLElement;
      expect(el).toBeTruthy();
      expect(el.className).toContain('max-w-[var(--page-max,94rem)]');
      expect(el.className).toContain('mx-auto');
      expect(el.className).toContain('w-full');
    });
  });

  describe('DetailList and DetailItem Components', () => {
    it('renders semantic dl list with two-column responsive grid and left-aligned labels/values', () => {
      const { container } = render(
        <DetailList>
          <DetailItem label="Full Name" value="Jane Doe" />
          <DetailItem label="Phone" value="+1 555-0199" subtitle="Primary Contact" />
        </DetailList>
      );

      const dl = container.querySelector('dl');
      expect(dl).toBeTruthy();
      expect(dl?.tagName.toLowerCase()).toBe('dl');

      // Grid definition: 8rem on mobile, 10rem on desktop
      const rows = container.querySelectorAll('div[data-testid="detail-item"], dl > div');
      expect(rows.length).toBe(2);

      const firstRow = rows[0] as HTMLElement;
      expect(firstRow.className).toContain('grid-cols-[8rem_1fr]');
      expect(firstRow.className).toContain('sm:grid-cols-[10rem_1fr]');

      // Label and value elements
      const dt = firstRow.querySelector('dt');
      const dd = firstRow.querySelector('dd');
      expect(dt).toBeTruthy();
      expect(dd).toBeTruthy();

      expect(dt?.textContent).toContain('Full Name');
      expect(dd?.textContent).toContain('Jane Doe');

      // Left-aligned check: neither dt nor dd should have text-right
      expect(dt?.className).not.toContain('text-right');
      expect(dd?.className).not.toContain('text-right');

      // Subtitle check
      const secondRow = rows[1] as HTMLElement;
      expect(secondRow.textContent).toContain('Primary Contact');
    });

    it('renders dense variant with reduced padding', () => {
      const { container } = render(
        <DetailList dense>
          <DetailItem label="Status" value="Active" />
        </DetailList>
      );

      const row = container.querySelector('dl > div') as HTMLElement;
      expect(row.className).toContain('py-2');
    });

    it('renders empty dash fallback when value is null or empty string', () => {
      const { container } = render(
        <DetailList>
          <DetailItem label="Allergies" value="" />
          <DetailItem label="Notes" value={null} />
        </DetailList>
      );

      const dds = container.querySelectorAll('dd');
      expect(dds[0]?.textContent?.trim()).toBe('—');
      expect(dds[1]?.textContent?.trim()).toBe('—');
    });
  });

  describe('DetailGrid Component', () => {
    it('switches from two columns on desktop to one column below 1024px', () => {
      const { container } = render(
        <DetailGrid data-testid="detail-grid">
          <div>Card 1</div>
          <div>Card 2</div>
        </DetailGrid>
      );

      const grid = (container.querySelector('[data-testid="detail-grid"]') || container.firstChild) as HTMLElement;
      expect(grid).toBeTruthy();
      expect(grid.className).toContain('grid-cols-1');
      expect(grid.className).toContain('lg:grid-cols-2');
      expect(grid.className).toContain('items-start');
      expect(grid.className).toContain('gap-6');
    });
  });

  describe('Table Column Sizing and Empty Cells', () => {
    interface TestRow {
      id: string;
      date: string;
      notes: string;
      status: string;
    }

    const testColumns: ColumnDef<TestRow>[] = [
      { key: 'date', header: 'Date', kind: 'short' },
      { key: 'notes', header: 'Notes', kind: 'text' },
      { key: 'status', header: 'Status', kind: 'short' },
    ];

    const testData: TestRow[] = [
      { id: '1', date: '15 Oct 2026', notes: 'Routine checkup notes', status: 'Completed' },
      { id: '2', date: '16 Oct 2026', notes: '', status: 'Scheduled' },
    ];

    it('applies kind classes correctly to Table headers and cells', () => {
      const { container } = render(
        <Table columns={testColumns} data={testData} keyExtractor={(r) => r.id} />
      );

      const ths = container.querySelectorAll('th');
      expect(ths[0].className).toContain('whitespace-nowrap');
      expect(ths[1].className).toContain('min-w-[14rem]');
      expect(ths[2].className).toContain('whitespace-nowrap');

      const secondRowTds = container.querySelectorAll('tbody tr')[1].querySelectorAll('td');
      // Empty notes cell should render em-dash inside value container
      const valDiv = secondRowTds[1].querySelector('.break-words') || secondRowTds[1];
      expect(valDiv.textContent?.trim()).toBe('—');
    });

    it('renders em-dash fallback for empty cell in compound Table component', () => {
      const { container } = render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead kind="short">Code</TableHead>
              <TableHead kind="text">Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell kind="short">ABC</TableCell>
              <TableCell kind="text">{''}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const tds = container.querySelectorAll('td');
      expect(tds[0].textContent?.trim()).toBe('ABC');
      expect(tds[1].textContent?.trim()).toBe('—');
    });
  });

  describe('Canonical Date and Time Formatters', () => {
    it('formatDate formats dates with unpadded day, 3-letter month, and 4-digit year', () => {
      expect(formatDate('2026-10-15')).toBe('15 Oct 2026');
      expect(formatDate('2026-05-04')).toBe('4 May 2026');
      expect(formatDate('2026-01-01')).toBe('1 Jan 2026');
      expect(formatDate('2026-12-31')).toBe('31 Dec 2026');
      expect(formatDate(new Date(2026, 9, 15))).toBe('15 Oct 2026');
      expect(formatDate(new Date(2026, 0, 7))).toBe('7 Jan 2026');
    });

    it('formatDate returns em-dash for null, undefined, or empty inputs', () => {
      expect(formatDate('')).toBe('—');
      expect(formatDate(null)).toBe('—');
      expect(formatDate(undefined)).toBe('—');
    });

    it('formatTime formats times in canonical 24-hour format HH:mm', () => {
      expect(formatTime('09:30')).toBe('09:30');
      expect(formatTime('14:15')).toBe('14:15');
      expect(formatTime('00:00')).toBe('00:00');
      expect(formatTime('23:59')).toBe('23:59');
    });

    it('formatTime converts AM/PM strings to 24-hour format', () => {
      expect(formatTime('9:30 AM')).toBe('09:30');
      expect(formatTime('09:30 AM')).toBe('09:30');
      expect(formatTime('12:00 AM')).toBe('00:00');
      expect(formatTime('12:30 PM')).toBe('12:30');
      expect(formatTime('1:45 PM')).toBe('13:45');
      expect(formatTime('11:59 PM')).toBe('23:59');
    });

    it('formatTime extracts time from ISO strings or Date instances', () => {
      expect(formatTime('2026-10-15T14:30:00Z')).toMatch(/^\d{2}:\d{2}$/);
      expect(formatTime(new Date(2026, 9, 15, 8, 5))).toBe('08:05');
      expect(formatTime(new Date(2026, 9, 15, 17, 45))).toBe('17:45');
    });

    it('formatTime returns em-dash for null, undefined, or empty inputs', () => {
      expect(formatTime('')).toBe('—');
      expect(formatTime(null)).toBe('—');
      expect(formatTime(undefined)).toBe('—');
    });
  });

  describe('Layout Scanner Test across Clinic Views', () => {
    const viewRawFiles = import.meta.glob<string>('../src/views/*.tsx', {
      query: '?raw',
      import: 'default',
      eager: true,
    });

    it('asserts no DetailList or DetailItem contains right-aligned value styling in views', () => {
      const targetViews = [
        'PatientPortal.tsx',
        'DoctorView.tsx',
        'ProfileView.tsx',
        'ReceptionistView.tsx',
        'AttendanceView.tsx',
        'FormularyTab.tsx',
        'BillingView.tsx',
        'DataManagementTab.tsx',
      ];

      for (const [pathKey, rawContent] of Object.entries(viewRawFiles)) {
        const isTarget = targetViews.some((v) => pathKey.endsWith(v));
        if (!isTarget) continue;

        // Check if DetailItem has className with text-right
        const detailItemMatches = rawContent.match(/<DetailItem[^>]*className=["'][^"']*text-right/g);
        expect(detailItemMatches, `Found text-right on DetailItem in ${pathKey}`).toBeNull();

        // Check if DetailList has text-right
        const detailListMatches = rawContent.match(/<DetailList[^>]*className=["'][^"']*text-right/g);
        expect(detailListMatches, `Found text-right on DetailList in ${pathKey}`).toBeNull();
      }
    });

    it('asserts all views with dates import canonical formatDate or formatTime from @/lib/time', () => {
      const targetViews = [
        'PatientPortal.tsx',
        'DoctorView.tsx',
        'ProfileView.tsx',
        'ReceptionistView.tsx',
        'AttendanceView.tsx',
        'FormularyTab.tsx',
        'BillingView.tsx',
        'DataManagementTab.tsx',
      ];

      for (const [pathKey, rawContent] of Object.entries(viewRawFiles)) {
        const isTarget = targetViews.some((v) => pathKey.endsWith(v));
        if (!isTarget) continue;

        if (rawContent.includes('formatDate') || rawContent.includes('formatTime')) {
          expect(rawContent, `${pathKey} should import from @/lib/time`).toContain("from '@/lib/time'");
        }
      }
    });
  });
});
