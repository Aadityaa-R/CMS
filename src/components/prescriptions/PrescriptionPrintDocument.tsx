import React, { useMemo } from 'react';
import { Prescription, PrescriptionItem } from '@/types/prescribing';
import { Patient, VitalSigns } from '@/types';
import { formatDoctorName } from '@/lib/doctorNames';
import { formatDate } from '@/lib/time';

export interface VitalsSummary {
  systolicBp?: number | string;
  diastolicBp?: number | string;
  temperatureCelsius?: number | string;
  heartRateBpm?: number | string;
  oxygenSaturationPct?: number | string;
}

export interface PrescriptionPrintDocumentProps {
  prescription: Prescription;
  patient?: Patient | null;
  vitals?: VitalsSummary | VitalSigns | null;
  className?: string;
}

export const PrescriptionPrintDocument: React.FC<PrescriptionPrintDocumentProps> = ({
  prescription,
  patient,
  vitals,
  className = '',
}) => {
  // Format Patient MRN, Name, and Gender initial
  const patientName = patient
    ? `${patient.firstName} ${patient.lastName}`.trim()
    : prescription.patientName || 'DEMO PATIENT';
  const mrn = patient?.mrn || prescription.patientId || 'MRN-84291';
  
  const genderInitial = useMemo(() => {
    if (!patient?.gender) return 'M';
    const g = patient.gender.toLowerCase();
    if (g.startsWith('f')) return 'F';
    if (g.startsWith('m')) return 'M';
    return 'O';
  }, [patient?.gender]);

  // Format Date and Time
  const formattedDate = useMemo(() => {
    if (!prescription.date) {
      return formatDate(new Date()) + ', 04:30 PM';
    }
    const d = formatDate(prescription.date);
    return `${d}, 11:30 AM`;
  }, [prescription.date]);

  // Format Address
  const address = useMemo(() => {
    if (patient?.address && patient.address.trim()) {
      return patient.address.trim().toUpperCase();
    }
    return 'PUNE';
  }, [patient?.address]);

  // Format Vitals line
  const vitalsText = useMemo(() => {
    const temp = vitals?.temperatureCelsius ? `${vitals.temperatureCelsius}` : '36';
    const bp = vitals?.systolicBp && vitals?.diastolicBp
      ? `${vitals.systolicBp}/${vitals.diastolicBp}`
      : '120/80';
    return `Temp (deg): ${temp}, BP: ${bp} mmHg`;
  }, [vitals]);

  // Helper to format medicine name with prefix (TAB., CAP., SYP., etc.)
  const formatMedicineName = (item: PrescriptionItem, idx: number) => {
    let prefix = 'TAB.';
    const form = (item.form || '').toLowerCase();
    if (form.includes('capsule')) prefix = 'CAP.';
    else if (form.includes('syrup')) prefix = 'SYP.';
    else if (form.includes('injection')) prefix = 'INJ.';
    else if (form.includes('inhaler')) prefix = 'INH.';
    else if (form.includes('cream') || form.includes('ointment')) prefix = 'OINT.';
    else if (form.includes('drop')) prefix = 'DROPS';

    const name = (item.medicineName || item.customName || 'MEDICINE').toUpperCase();
    const strength = item.strength ? item.strength.toUpperCase() : '';
    return `${idx + 1}) ${prefix} ${name} ${strength}`.trim();
  };

  // Helper to format Dosage (Schedule & Timing)
  const formatDosage = (item: PrescriptionItem) => {
    const amount = item.dose?.amount ?? 1;
    const freq = item.frequency || 'Once daily';
    const timing = item.timing || 'After food';

    let schedule = `${amount} Daily`;
    switch (freq) {
      case 'Once daily':
        if (timing === 'Morning') schedule = `${amount} Morning`;
        else if (timing === 'Evening') schedule = `${amount} Night`;
        else schedule = `${amount} Daily`;
        break;
      case 'Twice daily':
        schedule = `${amount} Morning, ${amount} Night`;
        break;
      case 'Three times daily':
        schedule = `${amount} Morning, ${amount} Aft, ${amount} Night`;
        break;
      case 'Four times daily':
        schedule = `${amount} Morning, 1 Aft, 1 Eve, 1 Night`;
        break;
      case 'At bedtime':
        schedule = `${amount} Night`;
        break;
      case 'As needed':
        schedule = `As Needed (PRN)`;
        break;
      case 'Every 8 hours':
        schedule = `${amount} Every 8 Hours`;
        break;
      default:
        schedule = `${amount} ${item.dose?.unit || 'dose'}, ${freq}`;
    }

    const timingLabel = timing ? `(${timing})` : '(Before Food)';
    return { schedule, timingLabel };
  };

  // Helper to format Duration & Total Count
  const formatDuration = (item: PrescriptionItem) => {
    const duration = item.duration || '10 Days';
    let shortForm = 'Tab';
    const f = (item.form || '').toLowerCase();
    if (f.includes('capsule')) shortForm = 'Cap';
    else if (f.includes('syrup')) shortForm = 'Bot';
    else if (f.includes('inhaler')) shortForm = 'Inh';
    else if (f.includes('injection')) shortForm = 'Amp';
    else if (f.includes('cream')) shortForm = 'Tube';
    else if (f.includes('drop')) shortForm = 'Bot';

    const total = item.quantity ? `(Tot:${item.quantity} ${shortForm})` : `(Tot:20 ${shortForm})`;
    return { duration, total };
  };

  // Advice Given instructions
  const adviceList = useMemo(() => {
    const list: string[] = [];
    
    // Add item-specific instructions
    prescription.items.forEach((item) => {
      if (item.instructions && item.instructions.trim()) {
        const trimmed = item.instructions.trim();
        if (!list.includes(trimmed)) {
          list.push(trimmed);
        }
      }
    });

    if (list.length === 0) {
      list.push('AVOID OILY AND SPICY FOOD');
      list.push('Drink plenty of boiled and cooled water.');
    }

    return list;
  }, [prescription.items]);

  return (
    <div
      className={`prescription-slip bg-white text-black font-sans text-xs max-w-3xl mx-auto p-4 sm:p-6 select-text rounded-none ${className}`}
      style={{ color: '#000', backgroundColor: '#fff' }}
    >
      <style>{`
        .prescription-slip {
          color: #000 !important;
          background-color: #fff !important;
        }
        .prescription-slip * {
          color: #000 !important;
        }
        .prescription-slip .sub-text {
          color: #444 !important;
        }
        .prescription-slip table tr,
        .prescription-slip table td,
        .prescription-slip table th {
          border-color: #000 !important;
        }
      `}</style>

      {/* Top Header Divider Rule */}
      <div className="w-full border-t-2 border-black mb-3" />

      {/* Top Header Block */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-2">
        {/* Left Column: Barcode & Patient Demographics */}
        <div className="space-y-0.5">
          {/* Barcode Graphic */}
          <div className="flex flex-col gap-0.5 mb-1.5" aria-hidden="true">
            <svg className="h-7 w-44 text-black" viewBox="0 0 160 28" fill="currentColor">
              <rect x="0" y="0" width="3" height="28" />
              <rect x="5" y="0" width="2" height="28" />
              <rect x="9" y="0" width="4" height="28" />
              <rect x="15" y="0" width="1" height="28" />
              <rect x="18" y="0" width="3" height="28" />
              <rect x="23" y="0" width="2" height="28" />
              <rect x="27" y="0" width="4" height="28" />
              <rect x="33" y="0" width="1" height="28" />
              <rect x="36" y="0" width="3" height="28" />
              <rect x="41" y="0" width="2" height="28" />
              <rect x="45" y="0" width="3" height="28" />
              <rect x="50" y="0" width="1" height="28" />
              <rect x="53" y="0" width="4" height="28" />
              <rect x="59" y="0" width="2" height="28" />
              <rect x="63" y="0" width="3" height="28" />
              <rect x="68" y="0" width="1" height="28" />
              <rect x="71" y="0" width="4" height="28" />
              <rect x="77" y="0" width="2" height="28" />
              <rect x="81" y="0" width="3" height="28" />
              <rect x="86" y="0" width="1" height="28" />
              <rect x="89" y="0" width="2" height="28" />
              <rect x="93" y="0" width="4" height="28" />
              <rect x="99" y="0" width="1" height="28" />
              <rect x="102" y="0" width="3" height="28" />
              <rect x="107" y="0" width="2" height="28" />
              <rect x="111" y="0" width="4" height="28" />
              <rect x="117" y="0" width="1" height="28" />
              <rect x="120" y="0" width="3" height="28" />
              <rect x="125" y="0" width="2" height="28" />
              <rect x="129" y="0" width="4" height="28" />
              <rect x="135" y="0" width="1" height="28" />
              <rect x="138" y="0" width="3" height="28" />
              <rect x="143" y="0" width="2" height="28" />
              <rect x="147" y="0" width="4" height="28" />
              <rect x="153" y="0" width="2" height="28" />
              <rect x="157" y="0" width="3" height="28" />
            </svg>
          </div>

          <div className="font-bold text-xs sm:text-sm tracking-tight">
            ID: {mrn} - {patientName.toUpperCase()} ({genderInitial})
          </div>
          <div className="text-xs font-semibold">
            Address: {address}
          </div>
          <div className="text-xs font-semibold">
            {vitalsText}
          </div>
        </div>

        {/* Right Column: Date */}
        <div className="text-right sm:self-start">
          <div className="font-bold text-xs whitespace-nowrap">
            Date: {formattedDate}
          </div>
        </div>
      </div>

      {/* Main Title Centered */}
      <div className="text-center my-2">
        <h2 className="text-base sm:text-xl font-bold tracking-wider uppercase inline-block">
          SAMPLE PRESCRIPTION
        </h2>
      </div>

      {/* Rx Prescription Symbol */}
      <div className="font-serif font-bold text-2xl select-none leading-none mb-1">
        ℞
      </div>

      {/* Medicines Table with Faint Watermark */}
      <div className="relative border-t-2 border-black border-b-2 border-black mb-3">
        {/* Subtle Clinic Logo Watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.05] pointer-events-none select-none z-0">
          <svg className="w-48 h-48 text-teal-800" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm1 14h-2v-3H8v-2h3V8h2v3h3v2h-3v3z" />
          </svg>
        </div>

        <table className="w-full text-xs border-collapse relative z-10">
          <thead>
            <tr className="border-b border-black text-left font-bold uppercase">
              <th className="py-1 px-1.5 w-[50%]">Medicine Name</th>
              <th className="py-1 px-1.5 w-[30%]">Dosage</th>
              <th className="py-1 px-1.5 w-[20%]">Duration</th>
            </tr>
          </thead>
          <tbody>
            {prescription.items.map((item, idx) => {
              const dosage = formatDosage(item);
              const duration = formatDuration(item);
              return (
                <tr
                  key={item.id || idx}
                  className="align-top"
                >
                  <td className="py-1.5 px-1.5 font-bold">
                    {formatMedicineName(item, idx)}
                  </td>
                  <td className="py-1.5 px-1.5">
                    <div className="font-semibold">{dosage.schedule}</div>
                    <div className="text-[11px] sub-text font-normal">{dosage.timingLabel}</div>
                  </td>
                  <td className="py-1.5 px-1.5">
                    <div className="font-semibold">{duration.duration}</div>
                    <div className="text-[11px] sub-text font-normal">{duration.total}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Advice Given Section */}
      <div className="mb-4 space-y-1">
        <div className="font-bold text-xs uppercase">
          Advice Given:
        </div>
        <div className="space-y-1 text-xs font-semibold pl-1">
          {adviceList.map((adv, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <span>•</span>
              <span>{adv.toUpperCase()}</span>
            </div>
          ))}

          {/* Clinical diagnosis note */}
          {prescription.diagnosis && (
            <div className="flex items-start gap-1.5 pt-0.5">
              <span>•</span>
              <span>DIAGNOSIS: {prescription.diagnosis.toUpperCase()}</span>
            </div>
          )}

          {/* Known Allergies note */}
          {patient?.allergies && patient.allergies.length > 0 && (
            <div className="flex items-start gap-1.5 pt-0.5">
              <span>•</span>
              <span>ALLERGIES: {patient.allergies.join(', ').toUpperCase()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Footer & Signature */}
      <div className="pt-3 border-t border-black flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 text-xs">
        <div className="space-y-0.5">
          <div className="font-semibold">
            Rx #: <span className="font-bold">{prescription.prescriptionNumber}</span>
          </div>
          <div>
            Status: <span className="font-bold uppercase">{prescription.status || 'ACTIVE'}</span>
          </div>
        </div>

        <div className="text-right sm:min-w-[200px]">
          <div className="border-b border-black w-48 ml-auto mb-1" />
          <div className="font-bold text-sm">
            Signed: {formatDoctorName(prescription.doctorName)}
          </div>
          <div className="text-[11px] sub-text">
            Consulting Physician • Beacon Health Clinic
          </div>
        </div>
      </div>
    </div>
  );
};
