import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import {
  DetailList,
  DetailItem,
  DetailGrid,
  calculateBalancedPadding,
} from '../src/components/ui/DetailList';
import { Card, CardHeader, CardTitle, CardContent } from '../src/components/ui/Card';

describe('Patient Records Tab - Balanced Two-Column Layout (M10.5)', () => {
  describe('DetailGrid Balanced Placement and DOM Order', () => {
    it('places Personal Information spanning two rows in column 1, and Medical Profile / Vitals in column 2', () => {
      const { container } = render(
        <DetailGrid balanced data-testid="test-grid">
          <Card data-testid="card-personal">
            <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
            <CardContent><DetailList><DetailItem label="Name" value="Eleanor Wright" /></DetailList></CardContent>
          </Card>
          <Card data-testid="card-medical">
            <CardHeader><CardTitle>Medical Profile</CardTitle></CardHeader>
            <CardContent><DetailList><DetailItem label="Allergies" value="Penicillin" /></DetailList></CardContent>
          </Card>
          <Card data-testid="card-vitals">
            <CardHeader><CardTitle>Latest Vitals</CardTitle></CardHeader>
            <CardContent><DetailList columns={2}><DetailItem label="Heart Rate" value="72 bpm" /></DetailList></CardContent>
          </Card>
        </DetailGrid>
      );

      const grid = container.querySelector('[data-testid="test-grid"]') as HTMLElement;
      expect(grid).toBeTruthy();
      expect(grid.className).toContain('grid');
      expect(grid.className).toContain('grid-cols-1');
      expect(grid.className).toContain('lg:grid-cols-2');
      expect(grid.className).toContain('lg:grid-rows-[auto_auto]');
      expect(grid.className).toContain('items-stretch');
      expect(grid.className).toContain('gap-6');

      const cards = grid.children;
      expect(cards.length).toBe(3);

      // Card 1: Personal Information (spans both rows in col 1)
      const personalCard = cards[0] as HTMLElement;
      expect(personalCard.className).toContain('lg:row-span-2');
      expect(personalCard.className).toContain('lg:col-start-1');
      expect(personalCard.className).toContain('lg:row-start-1');
      expect(personalCard.className).toContain('flex');
      expect(personalCard.className).toContain('flex-col');
      expect(personalCard.className).toContain('h-full');

      // Card 2: Medical Profile (col 2, row 1)
      const medicalCard = cards[1] as HTMLElement;
      expect(medicalCard.className).toContain('lg:col-start-2');
      expect(medicalCard.className).toContain('lg:row-start-1');
      expect(medicalCard.className).toContain('flex');
      expect(medicalCard.className).toContain('flex-col');
      expect(medicalCard.className).toContain('h-full');

      // Card 3: Latest Vitals (col 2, row 2)
      const vitalsCard = cards[2] as HTMLElement;
      expect(vitalsCard.className).toContain('lg:col-start-2');
      expect(vitalsCard.className).toContain('lg:row-start-2');
      expect(vitalsCard.className).toContain('flex');
      expect(vitalsCard.className).toContain('flex-col');
      expect(vitalsCard.className).toContain('h-full');
    });

    it('enforces single-column natural stacking order below 1024px', () => {
      const { container } = render(
        <DetailGrid balanced data-testid="test-grid">
          <div data-testid="card-1">Card 1</div>
          <div data-testid="card-2">Card 2</div>
          <div data-testid="card-3">Card 3</div>
        </DetailGrid>
      );

      const grid = container.querySelector('[data-testid="test-grid"]') as HTMLElement;
      // Below lg (1024px), grid-cols-1 applies
      expect(grid.className).toContain('grid-cols-1');

      const cards = Array.from(grid.children);
      expect(cards[0].getAttribute('data-testid')).toBe('card-1');
      expect(cards[1].getAttribute('data-testid')).toBe('card-2');
      expect(cards[2].getAttribute('data-testid')).toBe('card-3');
    });
  });

  describe('DetailList columns Option (Paired Rows)', () => {
    it('renders pairs of vitals in two-column rows when columns={2}', () => {
      const { container } = render(
        <DetailList columns={2}>
          <DetailItem label="Blood Pressure" value="120/80 mmHg" />
          <DetailItem label="Heart Rate" value="72 bpm" />
          <DetailItem label="Temperature" value="36.8°C" />
          <DetailItem label="SpO2" value="98%" />
          <DetailItem label="BMI" value="22.4" />
          <DetailItem label="Recorded" value="15 Oct 2026 09:30" />
        </DetailList>
      );

      const pairRows = container.querySelectorAll('.detail-pair-row');
      expect(pairRows.length).toBe(3);

      // Verify pair 1: Blood Pressure and Heart Rate
      expect(pairRows[0].textContent).toContain('Blood Pressure');
      expect(pairRows[0].textContent).toContain('120/80 mmHg');
      expect(pairRows[0].textContent).toContain('Heart Rate');
      expect(pairRows[0].textContent).toContain('72 bpm');

      // Verify pair 2: Temperature and SpO2
      expect(pairRows[1].textContent).toContain('Temperature');
      expect(pairRows[1].textContent).toContain('36.8°C');
      expect(pairRows[1].textContent).toContain('SpO2');
      expect(pairRows[1].textContent).toContain('98%');

      // Verify pair 3: BMI and Recorded
      expect(pairRows[2].textContent).toContain('BMI');
      expect(pairRows[2].textContent).toContain('22.4');
      expect(pairRows[2].textContent).toContain('Recorded');
      expect(pairRows[2].textContent).toContain('15 Oct 2026 09:30');

      // Verify label width token maintained on each item
      const dts = container.querySelectorAll('dt');
      expect(dts.length).toBe(6);
      dts.forEach((dt) => {
        expect(dt.parentElement?.className).toContain('grid-cols-[8rem_1fr]');
        expect(dt.parentElement?.className).toContain('sm:grid-cols-[10rem_1fr]');
      });
    });

    it('falls back to single column when columns={1}', () => {
      const { container } = render(
        <DetailList columns={1}>
          <DetailItem label="Blood Pressure" value="120/80 mmHg" />
          <DetailItem label="Heart Rate" value="72 bpm" />
        </DetailList>
      );

      const pairRows = container.querySelectorAll('.detail-pair-row');
      expect(pairRows.length).toBe(0);

      const items = container.querySelectorAll('div[data-testid="detail-item"]');
      expect(items.length).toBe(2);
    });
  });

  describe('Balancing Calculation Pure Function', () => {
    it('returns factor 1.0 when extra height is 0', () => {
      const result = calculateBalancedPadding(0, 9);
      expect(result.paddingFactor).toBe(1.0);
      expect(result.rowPaddingYRem).toBe(0.75);
      expect(result.remainingBottomSpacePx).toBe(0);
      expect(result.appliedExtraPx).toBe(0);
    });

    it('distributes extra height evenly when within 1.5x cap', () => {
      // 54px extra height across 9 rows = 6px extra per row.
      // Standard padding per row = 24px (12px top + 12px bottom = 0.75rem).
      // New padding = 30px -> 15px top/bottom (0.938rem).
      // Factor = 30 / 24 = 1.25.
      const result = calculateBalancedPadding(54, 9);
      expect(result.paddingFactor).toBe(1.25);
      expect(result.rowPaddingYRem).toBe(0.938);
      expect(result.appliedExtraPx).toBe(54);
      expect(result.remainingBottomSpacePx).toBe(0);
    });

    it('caps extra padding at 1.5x standard padding and retains remaining space for bottom padding', () => {
      // 200px extra height across 9 rows.
      // Max extra per row at 1.5x cap = 12px per row (6px top + 6px bottom = 0.375rem extra).
      // For 9 rows, max absorbed = 9 * 12 = 108px.
      // Remaining = 200 - 108 = 92px.
      const result = calculateBalancedPadding(200, 9);
      expect(result.paddingFactor).toBe(1.5);
      expect(result.rowPaddingYRem).toBe(1.125);
      expect(result.appliedExtraPx).toBe(108);
      expect(result.remainingBottomSpacePx).toBe(92);
    });

    it('handles small extra height across 3 rows', () => {
      // 3px extra across 3 rows = 1px per row.
      const result = calculateBalancedPadding(3, 3);
      expect(result.paddingFactor).toBe(1.042);
      expect(result.appliedExtraPx).toBe(3);
      expect(result.remainingBottomSpacePx).toBe(0);
    });

    it('handles negative or invalid values gracefully', () => {
      expect(calculateBalancedPadding(-10, 5).paddingFactor).toBe(1.0);
      expect(calculateBalancedPadding(100, 0).paddingFactor).toBe(1.0);
    });
  });

  describe('No Right-Aligned Values', () => {
    it('verifies all DetailItem labels and values are strictly left-aligned', () => {
      const { container } = render(
        <DetailList columns={2}>
          <DetailItem label="Blood Pressure" value="120/80 mmHg" />
          <DetailItem label="Heart Rate" value="72 bpm" />
        </DetailList>
      );

      const dts = container.querySelectorAll('dt');
      const dds = container.querySelectorAll('dd');

      dts.forEach((dt) => {
        expect(dt.className).toContain('text-left');
        expect(dt.className).not.toContain('text-right');
      });

      dds.forEach((dd) => {
        expect(dd.className).toContain('text-left');
        expect(dd.className).not.toContain('text-right');
      });
    });
  });
});
