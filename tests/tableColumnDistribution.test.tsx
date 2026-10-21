import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  ColumnDef,
  calculateVisibleColumns,
  getColumnMinWidthPx,
} from '../src/components/ui/Table';
import { RowActions } from '../src/components/ui/RowActions';

describe('Table Column Distribution (M10.7)', () => {
  interface SampleItem {
    id: string;
    patient: string;
    status: string;
    actions: string;
    time: string;
    complaint: string;
    apptId: string;
    num: string;
  }

  const sampleColumns: ColumnDef<SampleItem>[] = [
    { key: 'patient', header: 'Patient', kind: 'short', priority: 1, isPrimary: true },
    { key: 'status', header: 'Status', kind: 'short', priority: 2 },
    { key: 'actions', header: 'Actions', kind: 'short', priority: 3, isActions: true },
    { key: 'time', header: 'Time', kind: 'short', priority: 4 },
    { key: 'complaint', header: 'Complaint', kind: 'text', priority: 5 },
    { key: 'apptId', header: 'Appt ID', kind: 'short', priority: 6 },
    { key: 'num', header: '#', kind: 'short', priority: 7 },
  ];

  describe('calculateVisibleColumns Pure Function', () => {
    it('returns stack mode when container width is below 768px', () => {
      const result = calculateVisibleColumns(sampleColumns, 767, undefined, 16);
      expect(result.isStacked).toBe(true);
      expect(result.visibleColumns.length).toBe(sampleColumns.length);
      expect(result.hiddenColumns.length).toBe(0);
    });

    it('keeps all columns visible when container width is spacious', () => {
      const result = calculateVisibleColumns(sampleColumns, 1920, undefined, 16);
      expect(result.isStacked).toBe(false);
      expect(result.visibleColumns.length).toBe(sampleColumns.length);
      expect(result.hiddenColumns.length).toBe(0);
    });

    it('hides columns in the exact order of priority (highest number hides first)', () => {
      // Map custom widths:
      // Priority 1 (patient): 120px
      // Priority 2 (status): 100px
      // Priority 3 (actions): 140px
      // Priority 4 (time): 90px
      // Priority 5 (complaint): 240px
      // Priority 6 (apptId): 100px
      // Priority 7 (num): 50px
      // Total = 840px
      const widthsMap = {
        patient: 120,
        status: 100,
        actions: 140,
        time: 90,
        complaint: 240,
        apptId: 100,
        num: 50,
      };

      // Container width 800px: total (840px) > 800px -> column with priority 7 ('num') should hide first
      const r1 = calculateVisibleColumns(sampleColumns, 800, widthsMap, 16);
      expect(r1.isStacked).toBe(false);
      expect(r1.hiddenColumns.map((c) => c.key)).toEqual(['num']);
      expect(r1.visibleColumns.map((c) => c.key)).toEqual([
        'patient',
        'status',
        'actions',
        'time',
        'complaint',
        'apptId',
      ]);

      // Container width 700px: total without num is 790px > 700px -> next highest priority is 6 ('apptId')
      // but container is >= 768px. Let's test with container 780px:
      const r2 = calculateVisibleColumns(sampleColumns, 780, widthsMap, 16);
      expect(r2.isStacked).toBe(false);
      expect(r2.hiddenColumns.map((c) => c.key)).toEqual(['num', 'apptId']);
      expect(r2.visibleColumns.map((c) => c.key)).toEqual([
        'patient',
        'status',
        'actions',
        'time',
        'complaint',
      ]);
    });

    it('stops hiding columns as soon as remaining visible columns fit', () => {
      const widthsMap = {
        patient: 100,
        status: 100,
        actions: 140,
        time: 90,
        complaint: 224,
        apptId: 100,
        num: 50,
      };
      // Total without num is 754px. If container is 770px:
      const r = calculateVisibleColumns(sampleColumns, 770, widthsMap, 16);
      expect(r.isStacked).toBe(false);
      expect(r.hiddenColumns.length).toBe(1);
      expect(r.hiddenColumns[0].key).toBe('num');
      expect(r.visibleColumns.length).toBe(6);
    });

    it('never hides priority 1 columns', () => {
      const testCols: ColumnDef[] = [
        { key: 'col1', header: 'Col 1', priority: 1 },
        { key: 'col2', header: 'Col 2', priority: 2 },
      ];
      const widthsMap = { col1: 300, col2: 500 };
      // Container 770px: Col 2 (500px) hides, leaving Col 1 (300px) which fits
      const r = calculateVisibleColumns(testCols, 770, widthsMap, 16);
      expect(r.isStacked).toBe(false);
      expect(r.visibleColumns.map((c) => c.key)).toEqual(['col1']);
      expect(r.hiddenColumns.map((c) => c.key)).toEqual(['col2']);
    });

    it('returns stack mode when priority 1 columns alone do not fit container width', () => {
      const testCols: ColumnDef[] = [
        { key: 'p1_a', header: 'P1 A', priority: 1 },
        { key: 'p1_b', header: 'P1 B', priority: 1 },
      ];
      const widthsMap = { p1_a: 500, p1_b: 500 };
      // Priority 1 total = 1000px > 800px container
      const r = calculateVisibleColumns(testCols, 800, widthsMap, 16);
      expect(r.isStacked).toBe(true);
    });

    it('calculates minimum content width correctly via getColumnMinWidthPx', () => {
      expect(getColumnMinWidthPx({ key: 'custom', header: 'Custom', minWidthRem: 10 }, 16)).toBe(160);
      expect(getColumnMinWidthPx({ key: 'complaint', header: 'Complaint', kind: 'text' }, 16)).toBe(224);
      expect(getColumnMinWidthPx({ key: 'actions', header: 'Actions', isActions: true }, 16)).toBe(136);
      expect(getColumnMinWidthPx({ key: 'id', header: 'ID', kind: 'short' }, 16)).toBe(104);
    });
  });

  describe('Column Kind and Cell Styling', () => {
    it('applies whitespace-nowrap for short columns and min-w-[14rem] for text columns', () => {
      const { container } = render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead kind="short">Patient</TableHead>
              <TableHead kind="text">Complaint</TableHead>
              <TableHead kind="short" isActions className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell kind="short">Sarah Jenkins</TableCell>
              <TableCell kind="text">Severe migraine and light sensitivity</TableCell>
              <TableCell kind="short" isActions className="text-right">
                <button>Prescribe</button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const ths = container.querySelectorAll('th');
      expect(ths[0].className).toContain('whitespace-nowrap');
      expect(ths[1].className).toContain('min-w-[14rem]');
      expect(ths[2].className).toContain('whitespace-nowrap');

      const tds = container.querySelectorAll('td');
      expect(tds[0].className).toContain('whitespace-nowrap');
      expect(tds[1].className).toContain('min-w-[14rem]');
      expect(tds[2].className).toContain('whitespace-nowrap');
    });

    it('applies sticky right-0 bg-inherit z-10 for sticky actions cell', () => {
      const { container } = render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead kind="short">Name</TableHead>
              <TableHead kind="short" isActions className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="bg-teal-50">
              <TableCell kind="short">John Doe</TableCell>
              <TableCell kind="short" isActions className="text-right">
                <button>Action</button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const actionTh = container.querySelectorAll('th')[1];
      expect(actionTh.className).toContain('sticky');
      expect(actionTh.className).toContain('right-0');
      expect(actionTh.className).toContain('bg-inherit');

      const actionTd = container.querySelectorAll('td')[1];
      expect(actionTd.className).toContain('sticky');
      expect(actionTd.className).toContain('right-0');
      expect(actionTd.className).toContain('bg-inherit');
    });
  });

  describe('RowActions Single Row Equal Width', () => {
    it('applies equal button widths and md:flex-nowrap so buttons never stack on desktop', () => {
      const { container } = render(
        <RowActions
          actions={[
            { label: 'Admit to Desk', onClick: () => {} },
            { label: 'Prescribe', onClick: () => {} },
            { label: 'Transfer', onClick: () => {} },
          ]}
          subject="Sarah Jenkins"
        />
      );

      const group = container.querySelector('[role="group"]');
      expect(group?.className).toContain('md:flex-nowrap');
      expect(group?.className).toContain('whitespace-nowrap');

      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(3);
      buttons.forEach((btn) => {
        expect(btn.className).toContain('min-w-[6.5rem]');
        expect(btn.className).toContain('flex-1');
      });
    });
  });
});

