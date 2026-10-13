import React, { useState } from 'react';
import { useClinic } from '@/context/ClinicContext';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import {
  Pill,
  CheckCircle,
  AlertTriangle,
  ShieldAlert,
  Search,
} from 'lucide-react';

interface PharmacistViewProps {
  activeTab: string;
}

export const PharmacistView: React.FC<PharmacistViewProps> = ({ activeTab: _activeTab }) => {
  const { currentUser } = useAuth();
  const {
    prescriptions,
    inventory,
    patients,
    dispensePrescriptionItem,
    adjustInventoryStock,
  } = useClinic();

  const [search, setSearch] = useState('');

  const pendingRx = prescriptions.filter((r) => r.status === 'pending');
  const dispensedRx = prescriptions.filter((r) => r.status === 'dispensed');
  const lowStockItems = inventory.filter((i) => i.currentStock <= i.minStockLevel);

  const filteredInventory = inventory.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.sku.toLowerCase().includes(search.toLowerCase()) ||
      i.genericName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Clinic Pharmacy & Dispensary Desk
          </h2>
          <p className="text-xs text-slate-500">
            Pharmacist in Charge: {currentUser.name} • Electronic Medication Fulfillment
          </p>
        </div>
        <Badge variant="teal" size="md">
          Dispensary Terminal Online
        </Badge>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Prescriptions in Queue"
          value={pendingRx.length}
          subtitle="Awaiting medication fulfillment"
          icon={<Pill className="w-5 h-5" />}
          colorScheme="amber"
        />
        <StatCard
          title="Dispensed Prescriptions"
          value={dispensedRx.length}
          subtitle="Completed safety verification"
          icon={<CheckCircle className="w-5 h-5" />}
          colorScheme="teal"
        />
        <StatCard
          title="Low Stock Warnings"
          value={lowStockItems.length}
          subtitle="Medications below reorder level"
          icon={<AlertTriangle className="w-5 h-5" />}
          colorScheme={lowStockItems.length > 0 ? 'rose' : 'slate'}
        />
      </div>

      {/* Prescription Fulfillment Queue */}
      <Card>
        <CardHeader
          action={
            <span className="text-xs font-semibold text-slate-500">
              {prescriptions.length} Total Prescription Orders
            </span>
          }
        >
          <CardTitle>Doctor Electronic Prescriptions (e-Rx)</CardTitle>
          <CardDescription>
            Verify patient allergies, dosage instructions, and dispense medications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {prescriptions.map((rx) => {
            const patient = patients.find((p) => p.id === rx.patientId);
            return (
              <div
                key={rx.id}
                className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {rx.prescriptionNumber}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-xs font-semibold text-teal-800">
                        Patient: {rx.patientName}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Prescribed by {rx.doctorName} • Diagnosis: {rx.diagnosis}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {patient && patient.allergies.length > 0 && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 border border-rose-200 rounded-md text-[11px] text-rose-700 font-semibold">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                        <span>Allergies: {patient.allergies.join(', ')}</span>
                      </div>
                    )}
                    <Badge
                      size="sm"
                      variant={
                        rx.status === 'dispensed'
                          ? 'success'
                          : rx.status === 'partially_dispensed'
                          ? 'warning'
                          : 'danger'
                      }
                    >
                      {rx.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>

                {/* Items list */}
                <div className="space-y-2">
                  {rx.items.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-white rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-900">
                          {item.medicineName} ({item.dosage})
                        </div>
                        <div className="text-slate-600 text-[11px] mt-0.5">
                          Directions: {item.frequency} • Duration: {item.duration}
                        </div>
                        <div className="text-slate-500 text-[11px] italic">
                          "{item.instructions}"
                        </div>
                      </div>

                      <div>
                        {item.dispensed ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            Dispensed
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="primary"
                            icon={<Pill className="w-3.5 h-3.5" />}
                            onClick={() =>
                              dispensePrescriptionItem(
                                rx.id,
                                item.id,
                                currentUser.name
                              )
                            }
                          >
                            Dispense & Log
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Medication Inventory Management */}
      <Card>
        <CardHeader
          action={
            <div className="relative w-64 flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search stock by drug name or SKU..."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-3.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white shadow-xs transition-all"
              />
            </div>
          }
        >
          <CardTitle>Pharmaceutical Inventory & Batch Control</CardTitle>
          <CardDescription>
            Monitor real-time dispensary stock levels, expiry dates, and threshold alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-medium">
                <tr>
                  <th className="px-4 py-3">SKU & Item Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Batch Number</th>
                  <th className="px-4 py-3">Expiry Date</th>
                  <th className="px-4 py-3">Current Stock</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3 text-right">Quick Restock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInventory.map((item) => {
                  const isLow = item.currentStock <= item.minStockLevel;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {item.sku} • {item.genericName}
                        </div>
                      </td>
                      <td className="px-4 py-3 capitalize text-slate-700">
                        {item.category}
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-mono text-[11px]">
                        {item.batchNumber}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{item.expiryDate}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-bold ${
                            isLow ? 'text-rose-600' : 'text-slate-900'
                          }`}
                        >
                          {item.currentStock} {item.unit}
                        </span>
                        {isLow && (
                          <div className="text-[10px] text-rose-600 font-medium mt-0.5">
                            Min: {item.minStockLevel}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{item.location}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="xs"
                          variant="soft"
                          onClick={() => adjustInventoryStock(item.id, 50)}
                        >
                          +50 Units
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
