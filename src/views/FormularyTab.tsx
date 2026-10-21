import React, { useState, useMemo } from 'react';
import { useClinic } from '@/context/ClinicContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import { RowActions } from '@/components/ui/RowActions';
import { Plus, CheckCircle2 } from 'lucide-react';
import { User } from '@/types';
import { Medicine, DrugClass, MedicineForm } from '@/types/prescribing';
import { ALLERGEN_RULES } from '@/lib/prescribing';
import { isAdmin, hasCapability } from '@/lib/permissions';

interface FormularyTabProps {
  currentUser: User;
}

const DRUG_CLASS_LABELS: Record<DrugClass, string> = {
  analgesic: 'Analgesic',
  antibiotic: 'Antibiotic',
  antihypertensive: 'Antihypertensive',
  antidiabetic: 'Antidiabetic',
  lipid_lowering: 'Lipid-lowering',
  gastric: 'Gastric',
  respiratory: 'Respiratory',
  antihistamine: 'Antihistamine',
  vitamin: 'Vitamin',
  other: 'Other',
};

const DRUG_CLASS_OPTIONS = [
  { value: 'all', label: 'All Drug Classes' },
  { value: 'analgesic', label: 'Analgesic' },
  { value: 'antibiotic', label: 'Antibiotic' },
  { value: 'antihypertensive', label: 'Antihypertensive' },
  { value: 'antidiabetic', label: 'Antidiabetic' },
  { value: 'lipid_lowering', label: 'Lipid-lowering' },
  { value: 'gastric', label: 'Gastric' },
  { value: 'respiratory', label: 'Respiratory' },
  { value: 'antihistamine', label: 'Antihistamine' },
  { value: 'vitamin', label: 'Vitamin' },
  { value: 'other', label: 'Other' },
];

const FORM_OPTIONS: { value: MedicineForm; label: string }[] = [
  { value: 'Tablet', label: 'Tablet' },
  { value: 'Capsule', label: 'Capsule' },
  { value: 'Syrup', label: 'Syrup' },
  { value: 'Inhaler', label: 'Inhaler' },
  { value: 'Cream', label: 'Cream' },
  { value: 'Drops', label: 'Drops' },
  { value: 'Injection', label: 'Injection' },
];

export const FormularyTab: React.FC<FormularyTabProps> = ({ currentUser }) => {
  const { medicines = [], addMedicine, updateMedicine, toggleMedicineStatus, modules = [] } = useClinic();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Notification state
  const [notification, setNotification] = useState<string | null>(null);
  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Add/Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [formGenericName, setFormGenericName] = useState('');
  const [formBrandNames, setFormBrandNames] = useState('');
  const [formDrugClass, setFormDrugClass] = useState<DrugClass>('analgesic');
  const [formMedicineForm, setFormMedicineForm] = useState<MedicineForm>('Tablet');
  const [formStrengths, setFormStrengths] = useState('');
  const [formDefaultRoute, setFormDefaultRoute] = useState('Oral');
  const [formError, setFormError] = useState('');

  const canManage = isAdmin(currentUser, modules) || hasCapability(currentUser, 'administrativeAccess', modules);

  // Filtered medicines
  const filteredMedicines = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return (medicines || []).filter((m) => {
      const generic = (m.genericName || '').toLowerCase();
      const matchSearch =
        !q ||
        generic.includes(q) ||
        (m.brandNames && m.brandNames.some((b) => (b || '').toLowerCase().includes(q)));

      const matchClass = selectedClass === 'all' || m.drugClass === selectedClass;
      return matchSearch && matchClass;
    });
  }, [medicines, searchQuery, selectedClass]);

  const paginatedMedicines = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredMedicines.slice(start, start + pageSize);
  }, [filteredMedicines, currentPage]);

  const handleOpenAddModal = () => {
    setEditingMedicine(null);
    setFormGenericName('');
    setFormBrandNames('');
    setFormDrugClass('analgesic');
    setFormMedicineForm('Tablet');
    setFormStrengths('500 mg');
    setFormDefaultRoute('Oral');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (med: Medicine) => {
    setEditingMedicine(med);
    setFormGenericName(med.genericName);
    setFormBrandNames(med.brandNames ? med.brandNames.join(', ') : '');
    setFormDrugClass(med.drugClass);
    setFormMedicineForm(med.form);
    setFormStrengths(med.strengths.join(', '));
    setFormDefaultRoute(med.defaultRoute);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSaveMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanGeneric = formGenericName.trim();
    if (!cleanGeneric) {
      setFormError('Generic name is required.');
      return;
    }

    const cleanStrengths = formStrengths
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (cleanStrengths.length === 0) {
      setFormError('At least one strength is required.');
      return;
    }

    const cleanRoute = formDefaultRoute.trim();
    if (!cleanRoute) {
      setFormError('Default route is required.');
      return;
    }

    const brandArray = formBrandNames
      .split(',')
      .map((b) => b.trim())
      .filter((b) => b.length > 0);

    if (editingMedicine) {
      const result = await updateMedicine(
        editingMedicine.id,
        {
          genericName: cleanGeneric,
          brandNames: brandArray.length > 0 ? brandArray : undefined,
          drugClass: formDrugClass,
          form: formMedicineForm,
          strengths: cleanStrengths,
          defaultRoute: cleanRoute,
        },
        currentUser
      );

      if (!result.success) {
        setFormError(result.error || 'Failed to update medicine.');
        return;
      }

      showNotification(`Formulary medicine "${cleanGeneric}" updated.`);
    } else {
      const result = await addMedicine(
        {
          genericName: cleanGeneric,
          brandNames: brandArray.length > 0 ? brandArray : undefined,
          drugClass: formDrugClass,
          form: formMedicineForm,
          strengths: cleanStrengths,
          defaultRoute: cleanRoute,
          active: true,
        },
        currentUser
      );

      if (!result.success) {
        setFormError(result.error || 'Failed to add medicine.');
        return;
      }

      showNotification(`Medicine "${cleanGeneric}" added to formulary.`);
    }

    setIsModalOpen(false);
  };

  const handleToggleStatus = async (med: Medicine) => {
    const res = await toggleMedicineStatus(med.id, currentUser);
    if (res.success) {
      showNotification(`Medicine "${med.genericName}" marked ${res.active ? 'Active' : 'Inactive'}.`);
    } else {
      showNotification(res.error || 'Failed to change medicine status.');
    }
  };

  if (!canManage) {
    return (
      <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <CardContent className="py-12 text-center text-xs text-slate-500">
          Administrative access required to view or manage the clinic formulary.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Real-time Feedback Notification */}
      {notification && (
        <div className="p-3.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <span className="font-semibold text-teal-950 dark:text-teal-100">Formulary:</span>
            <span>{notification}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-teal-700 dark:text-teal-400 hover:text-teal-900 dark:hover:text-teal-200 text-xs font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Formulary Management Card */}
      <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <CardTitle>Formulary ({medicines.length})</CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Approved clinical medication registry for outpatient electronic prescribing.
            </p>
          </div>
          <Button
            size="sm"
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={handleOpenAddModal}
          >
            Add Medicine
          </Button>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-4">
          {/* Search and Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by generic or brand name..."
            />
            <Select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setCurrentPage(1);
              }}
              options={DRUG_CLASS_OPTIONS}
            />
          </div>

          {/* Medicines Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <Table stackBelow="lg">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-4/12 min-w-[180px]">Medicine</TableHead>
                  <TableHead className="w-2/12 min-w-[130px]">Class</TableHead>
                  <TableHead className="w-1/12 min-w-[90px]">Form</TableHead>
                  <TableHead className="w-3/12 min-w-[150px]">Strengths</TableHead>
                  <TableHead className="w-1/12 min-w-[80px]">Status</TableHead>
                  <TableHead className="w-1/12 min-w-[140px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedMedicines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-slate-500">
                      No medications match the current filter criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedMedicines.map((med) => (
                    <TableRow key={med.id}>
                      <TableCell width="fit" label="Medicine">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {med.genericName}
                        </div>
                        {med.brandNames && med.brandNames.length > 0 && (
                          <div className="text-[0.6875rem] text-slate-500 dark:text-slate-400">
                            Brand: {med.brandNames.join(', ')}
                          </div>
                        )}
                      </TableCell>
                      <TableCell width="fit" label="Class" className="text-slate-700 dark:text-slate-300">
                        {DRUG_CLASS_LABELS[med.drugClass] || med.drugClass}
                      </TableCell>
                      <TableCell width="fit" label="Form" className="text-slate-700 dark:text-slate-300">
                        {med.form}
                      </TableCell>
                      <TableCell width="flex" label="Strengths" className="text-slate-600 dark:text-slate-300">
                        {med.strengths.join(', ')}
                      </TableCell>
                      <TableCell width="fit" label="Status" className="text-slate-700 dark:text-slate-300">
                        {med.active ? 'Active' : 'Inactive'}
                      </TableCell>
                      <TableCell width="fit" isActions label="Actions" className="text-right whitespace-nowrap">
                        <RowActions
                          actions={[
                            {
                              label: 'Edit',
                              onClick: () => handleOpenEditModal(med),
                              ariaLabel: `Edit medicine ${med.genericName}`,
                            },
                            {
                              label: med.active ? 'Deactivate' : 'Activate',
                              onClick: () => handleToggleStatus(med),
                              ariaLabel: `${med.active ? 'Deactivate' : 'Activate'} medicine ${med.genericName}`,
                            },
                          ]}
                          subject={med.genericName}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {filteredMedicines.length > pageSize && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredMedicines.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          )}
        </CardContent>
      </Card>

      {/* Demo Allergen Rules Review Section */}
      <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800">
          <CardTitle>Demo Allergen & Cross-Reactivity Rules</CardTitle>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
            Demo rules. A clinician should review them.
          </p>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-3">
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {ALLERGEN_RULES.map((rule, idx) => (
              <div key={idx} className="py-2.5 first:pt-0 last:pb-0 space-y-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="font-semibold text-slate-900 dark:text-slate-100 capitalize">
                    Allergen: {rule.allergenKey}
                  </span>
                  <span className="text-[0.6875rem] text-slate-500 dark:text-slate-400">
                    Target Classes: {rule.targetClasses?.join(', ') || 'None'}
                  </span>
                </div>
                <div className="text-slate-600 dark:text-slate-400">
                  Targeted Medicines: {rule.targetMedicines?.join(', ')}
                </div>
                <div className="text-[0.6875rem] text-slate-500 dark:text-slate-400 italic">
                  {rule.warningMessage}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add / Edit Medicine Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingMedicine ? `Edit Medicine: ${editingMedicine.genericName}` : 'Add New Medicine'}
          description="Formulary entries are immediately accessible to physicians in the prescribing dropdown."
          maxWidth="md"
          footer={
            <div className="flex justify-end gap-2 w-full">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSaveMedicine}
              >
                {editingMedicine ? 'Save Changes' : 'Add Medicine'}
              </Button>
            </div>
          }
        >
          <form onSubmit={handleSaveMedicine} className="space-y-3 text-xs" noValidate>
            {formError && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs rounded-lg">
                {formError}
              </div>
            )}

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Generic Name *
              </label>
              <Input
                value={formGenericName}
                onChange={(e) => {
                  setFormGenericName(e.target.value);
                  if (formError) setFormError('');
                }}
                placeholder="e.g. Amlodipine Besylate"
                required
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Brand Names (comma separated)
              </label>
              <Input
                value={formBrandNames}
                onChange={(e) => setFormBrandNames(e.target.value)}
                placeholder="e.g. Norvasc, Amlodin"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Drug Class *
                </label>
                <Select
                  value={formDrugClass}
                  onChange={(e) => setFormDrugClass(e.target.value as DrugClass)}
                  options={DRUG_CLASS_OPTIONS.filter((o) => o.value !== 'all')}
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Dosage Form *
                </label>
                <Select
                  value={formMedicineForm}
                  onChange={(e) => setFormMedicineForm(e.target.value as MedicineForm)}
                  options={FORM_OPTIONS}
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Strengths (comma separated) *
              </label>
              <Input
                value={formStrengths}
                onChange={(e) => {
                  setFormStrengths(e.target.value);
                  if (formError) setFormError('');
                }}
                placeholder="e.g. 2.5 mg, 5 mg, 10 mg"
                required
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Default Route *
              </label>
              <Input
                value={formDefaultRoute}
                onChange={(e) => setFormDefaultRoute(e.target.value)}
                placeholder="e.g. Oral, Inhalation, Topical"
                required
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
