import React, { useState } from 'react';
import { Shield, Upload, CheckCircle, AlertCircle, User, FileText, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { useAlgorand } from '../contexts/AlgorandContext';
import { toast } from 'sonner';

type KycStatus = 'not_started' | 'in_progress' | 'pending_review' | 'approved' | 'rejected';
type DocType = 'passport' | 'drivers_license' | 'national_id';

const KYCPage: React.FC = () => {
  const { address } = useAlgorand();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [kycStatus] = useState<KycStatus>('not_started');

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    nationality: '',
    taxId: '',
    address: '',
    city: '',
    country: '',
    postalCode: '',
  });

  const [docType, setDocType] = useState<DocType>('passport');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    if (!address) { toast.error('Connect wallet first'); return; }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('walletAddress', address);
      Object.entries(form).forEach(([k, v]) => formData.append(k, v));
      formData.append('docType', docType);
      if (docFile) formData.append('document', docFile);
      if (selfieFile) formData.append('selfie', selfieFile);

      const res = await fetch('/api/kyc/submit', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setStep(3);
        toast.success('KYC submission received — under review');
      } else {
        throw new Error(data.message || 'Submission failed');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const statusColors: Record<KycStatus, string> = {
    not_started: 'text-muted-foreground',
    in_progress: 'text-yellow-400',
    pending_review: 'text-yellow-400',
    approved: 'text-accent',
    rejected: 'text-destructive',
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center gap-4 mb-8">
        <Shield className="w-8 h-8 text-accent" />
        <div>
          <h1 className="text-3xl font-bold uppercase">KYC VERIFICATION</h1>
          <p className="text-muted-foreground text-sm">Know Your Customer — required for trading</p>
        </div>
        {kycStatus !== 'not_started' && (
          <span className={`ml-auto font-bold uppercase text-sm ${statusColors[kycStatus]}`}>
            {kycStatus.replace('_', ' ')}
          </span>
        )}
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map(s => (
          <React.Fragment key={s}>
            <div
              className={`w-8 h-8 border-2 flex items-center justify-center font-bold text-sm
                ${step >= s ? 'border-accent text-accent bg-accent/10' : 'border-foreground text-muted-foreground'}`}
            >
              {s}
            </div>
            {s < 3 && <div className={`flex-1 h-0.5 ${step > s ? 'bg-accent' : 'bg-foreground/20'}`} />}
          </React.Fragment>
        ))}
        <div className="ml-4 text-sm font-bold uppercase text-muted-foreground">
          {step === 1 ? 'PERSONAL INFO' : step === 2 ? 'DOCUMENTS' : 'SUBMITTED'}
        </div>
      </div>

      <motion.div
        key={step}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="border-4 border-foreground p-6 bg-black space-y-5"
      >
        {step === 1 && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-accent" />
              <h2 className="font-bold uppercase">PERSONAL INFORMATION</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: 'firstName', label: 'FIRST NAME' },
                { name: 'lastName', label: 'LAST NAME' },
                { name: 'dateOfBirth', label: 'DATE OF BIRTH', type: 'date' },
                { name: 'nationality', label: 'NATIONALITY' },
                { name: 'taxId', label: 'TAX ID / SSN' },
              ].map(field => (
                <div key={field.name}>
                  <label className="block text-xs font-bold uppercase mb-1">{field.label}</label>
                  <input
                    type={field.type || 'text'}
                    name={field.name}
                    value={(form as any)[field.name]}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 bg-background border-2 border-foreground focus:border-accent outline-none text-sm"
                    placeholder={field.label}
                  />
                </div>
              ))}
            </div>
            <div className="border-t-2 border-foreground pt-4">
              <label className="block text-xs font-bold uppercase mb-1">RESIDENTIAL ADDRESS</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { name: 'address', label: 'STREET ADDRESS' },
                  { name: 'city', label: 'CITY' },
                  { name: 'country', label: 'COUNTRY' },
                  { name: 'postalCode', label: 'POSTAL CODE' },
                ].map(field => (
                  <div key={field.name}>
                    <label className="block text-xs uppercase mb-1 text-muted-foreground">{field.label}</label>
                    <input
                      type="text"
                      name={field.name}
                      value={(form as any)[field.name]}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2 bg-background border-2 border-foreground focus:border-accent outline-none text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={!form.firstName || !form.lastName || !form.dateOfBirth}
              className="w-full py-3 bg-accent text-black font-bold uppercase hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2"
            >
              NEXT: UPLOAD DOCUMENTS →
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-accent" />
              <h2 className="font-bold uppercase">IDENTITY DOCUMENTS</h2>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase mb-2">DOCUMENT TYPE</label>
              <select
                value={docType}
                onChange={e => setDocType(e.target.value as DocType)}
                className="w-full px-3 py-2 bg-background border-2 border-foreground focus:border-accent outline-none text-sm"
              >
                <option value="passport">Passport</option>
                <option value="drivers_license">Driver's License</option>
                <option value="national_id">National ID</option>
              </select>
            </div>
            {[
              { label: 'DOCUMENT PHOTO', file: docFile, setFile: setDocFile, accept: 'image/*,.pdf' },
              { label: 'SELFIE WITH DOCUMENT', file: selfieFile, setFile: setSelfieFile, accept: 'image/*' },
            ].map(({ label, file, setFile, accept }) => (
              <div key={label}>
                <label className="block text-xs font-bold uppercase mb-2">{label}</label>
                <label className="cursor-pointer block border-2 border-dashed border-foreground hover:border-accent transition-colors p-8 text-center">
                  <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                  {file
                    ? <span className="text-accent text-sm font-bold">{file.name}</span>
                    : <span className="text-muted-foreground text-sm">Click to upload {label.toLowerCase()}</span>}
                  <input type="file" accept={accept} className="hidden"
                    onChange={e => setFile(e.target.files?.[0] ?? null)} />
                </label>
              </div>
            ))}

            <div className="border-2 border-yellow-400/40 bg-yellow-400/5 p-4 text-xs text-yellow-400">
              <strong>PRIVACY NOTICE:</strong> Documents are encrypted and stored securely. Used only for AML/KYC compliance. Never shared with third parties.
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)}
                className="flex-1 py-3 border-2 border-foreground font-bold uppercase hover:border-accent transition-colors">
                ← BACK
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !docFile}
                className="flex-1 py-3 bg-accent text-black font-bold uppercase hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                {loading ? 'SUBMITTING...' : 'SUBMIT FOR REVIEW'}
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <div className="text-center py-8 space-y-4">
            <CheckCircle className="w-16 h-16 text-accent mx-auto" />
            <h2 className="text-2xl font-bold uppercase">SUBMISSION RECEIVED</h2>
            <p className="text-muted-foreground">
              Your KYC documents are under review. Verification typically takes 1–2 business days.
              You'll receive a notification when the review is complete.
            </p>
            <div className="border-2 border-foreground p-4 text-left text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground uppercase text-xs">Name</span>
                <span className="font-bold">{form.firstName} {form.lastName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground uppercase text-xs">Wallet</span>
                <span className="font-mono text-xs">{address?.slice(0, 8)}...{address?.slice(-4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground uppercase text-xs">Status</span>
                <span className="font-bold text-yellow-400">PENDING REVIEW</span>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default KYCPage;
