'use client';

import { useAccount } from 'wagmi';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConnectionStatus } from '@/components/wallet/ConnectionStatus';

export default function KYCPage() {
  const { address } = useAccount();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  const [formData, setFormData] = useState({
    // Personal Information
    fullName: '',
    dateOfBirth: '',
    nationality: '',
    jurisdiction: 'india',
    
    // Contact Information
    email: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    
    // Documents
    idProofFile: null as File | null,
    addressProofFile: null as File | null,
    selfieFile: null as File | null,
    
    // Declarations
    termsAccepted: false,
    dataProcessingConsent: false,
    taxComplianceConfirmation: false,
  });
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        [fieldName]: file
      }));
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // In production: upload documents to secure storage, submit to KYC provider API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const response = await fetch(`/api/kyc/${address}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) throw new Error('Submission failed');
      
      alert('KYC application submitted successfully! You will be notified once verification is complete (3-5 business days).');
      router.push('/portfolio');
      
    } catch (error) {
      console.error('KYC submission error:', error);
      alert('Failed to submit KYC application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const isStep1Valid = formData.fullName && formData.dateOfBirth && formData.email;
  const isStep2Valid = formData.addressLine1 && formData.city && formData.country;
  const isStep3Valid = formData.idProofFile && formData.addressProofFile && formData.selfieFile;
  const isStep4Valid = formData.termsAccepted && formData.dataProcessingConsent && formData.taxComplianceConfirmation;
  
  return (
    <ConnectionStatus requireConnection requireCorrectNetwork>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 mb-4 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              KYC Verification
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Complete your identity verification to access restricted assets and full platform features.
            </p>
          </div>
          
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                      currentStep === step
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900/30'
                        : currentStep > step
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}>
                      {currentStep > step ? '✓' : step}
                    </div>
                    <span className="text-xs mt-2 text-slate-600 dark:text-slate-400 hidden sm:block">
                      {step === 1 && 'Personal'}
                      {step === 2 && 'Address'}
                      {step === 3 && 'Documents'}
                      {step === 4 && 'Review'}
                    </span>
                  </div>
                  {step < 4 && (
                    <div className={`h-1 flex-1 mx-2 transition-all ${
                      currentStep > step ? 'bg-green-600' : 'bg-slate-200 dark:bg-slate-700'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Warning Banner */}
          <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="text-sm text-amber-800 dark:text-amber-300">
                <p className="font-semibold mb-1">Important Notice</p>
                <p>Your personal information will be securely encrypted and stored in compliance with GDPR and local data protection laws. We use third-party KYC providers for identity verification.</p>
              </div>
            </div>
          </div>
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 sm:p-8">
            
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Personal Information</h2>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Full Legal Name *
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="As it appears on government ID"
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Date of Birth *
                    </label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                      required
                      max={new Date(Date.now() - 18 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Nationality *
                    </label>
                    <select
                      name="nationality"
                      value={formData.nationality}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option value="">Select...</option>
                      <option value="indian">Indian</option>
                      <option value="emirati">Emirati</option>
                      <option value="singaporean">Singaporean</option>
                      <option value="british">British</option>
                      <option value="american">American</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Tax Jurisdiction *
                  </label>
                  <select
                    name="jurisdiction"
                    value={formData.jurisdiction}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="india">India</option>
                    <option value="uae">UAE</option>
                    <option value="singapore">Singapore</option>
                    <option value="uk">United Kingdom</option>
                    <option value="us">United States</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="your@email.com"
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+1 (555) 123-4567"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            )}
            
            {/* Step 2: Address Information */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Residential Address</h2>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Address Line 1 *
                  </label>
                  <input
                    type="text"
                    name="addressLine1"
                    value={formData.addressLine1}
                    onChange={handleInputChange}
                    placeholder="Street address"
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    name="addressLine2"
                    value={formData.addressLine2}
                    onChange={handleInputChange}
                    placeholder="Apartment, suite, etc. (optional)"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      State/Province
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Postal Code *
                    </label>
                    <input
                      type="text"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Country *
                    </label>
                    <select
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option value="">Select...</option>
                      <option value="india">India</option>
                      <option value="uae">United Arab Emirates</option>
                      <option value="singapore">Singapore</option>
                      <option value="uk">United Kingdom</option>
                      <option value="us">United States</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
            
            {/* Step 3: Document Upload */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Identity Documents</h2>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    <span className="font-semibold">Accepted documents:</span> Passport, Driver's License, National ID Card, Utility Bill (for address proof)
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Government-Issued ID * <span className="text-xs text-slate-500">(Passport, Driver's License, National ID)</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileChange(e, 'idProofFile')}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-300"
                  />
                  {formData.idProofFile && (
                    <p className="mt-2 text-sm text-green-600 dark:text-green-400">✓ {formData.idProofFile.name}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Proof of Address * <span className="text-xs text-slate-500">(Utility bill, bank statement within 3 months)</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileChange(e, 'addressProofFile')}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-300"
                  />
                  {formData.addressProofFile && (
                    <p className="mt-2 text-sm text-green-600 dark:text-green-400">✓ {formData.addressProofFile.name}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Selfie with ID * <span className="text-xs text-slate-500">(Hold your ID next to your face)</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'selfieFile')}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-300"
                  />
                  {formData.selfieFile && (
                    <p className="mt-2 text-sm text-green-600 dark:text-green-400">✓ {formData.selfieFile.name}</p>
                  )}
                </div>
              </div>
            )}
            
            {/* Step 4: Review & Consent */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Review & Consent</h2>
                
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-2 text-sm">
                  <p><span className="font-semibold">Name:</span> {formData.fullName || '—'}</p>
                  <p><span className="font-semibold">Date of Birth:</span> {formData.dateOfBirth || '—'}</p>
                  <p><span className="font-semibold">Email:</span> {formData.email || '—'}</p>
                  <p><span className="font-semibold">Address:</span> {formData.addressLine1 || '—'}</p>
                  <p><span className="font-semibold">Wallet:</span> {address}</p>
                </div>
                
                <div className="space-y-4">
                  <label className="flex items-start gap-3 cursor-pointer p-4 border-2 border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-all">
                    <input
                      type="checkbox"
                      name="termsAccepted"
                      checked={formData.termsAccepted}
                      onChange={handleInputChange}
                      className="mt-1 w-5 h-5 text-blue-600 focus:ring-2 focus:ring-blue-500 rounded"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 dark:text-slate-100">Terms & Conditions</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        I have read and agree to the platform's Terms of Service and Privacy Policy.
                      </p>
                    </div>
                  </label>
                  
                  <label className="flex items-start gap-3 cursor-pointer p-4 border-2 border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-all">
                    <input
                      type="checkbox"
                      name="dataProcessingConsent"
                      checked={formData.dataProcessingConsent}
                      onChange={handleInputChange}
                      className="mt-1 w-5 h-5 text-blue-600 focus:ring-2 focus:ring-blue-500 rounded"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 dark:text-slate-100">Data Processing Consent</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        I consent to the collection, processing, and storage of my personal data for identity verification purposes, in compliance with GDPR and applicable data protection laws.
                      </p>
                    </div>
                  </label>
                  
                  <label className="flex items-start gap-3 cursor-pointer p-4 border-2 border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-all">
                    <input
                      type="checkbox"
                      name="taxComplianceConfirmation"
                      checked={formData.taxComplianceConfirmation}
                      onChange={handleInputChange}
                      className="mt-1 w-5 h-5 text-blue-600 focus:ring-2 focus:ring-blue-500 rounded"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 dark:text-slate-100">Tax Compliance</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        I understand that I am responsible for complying with all applicable tax laws in my jurisdiction and will report any investment income as required.
                      </p>
                    </div>
                  </label>
                </div>
                
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mt-6">
                  <p className="text-sm text-green-800 dark:text-green-300">
                    <span className="font-semibold">Next steps:</span> Your application will be reviewed within 3-5 business days. You'll receive email notifications at each stage of the verification process.
                  </p>
                </div>
              </div>
            )}
            
            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                disabled={currentStep === 1}
                className="px-6 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Previous
              </button>
              
              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  disabled={
                    (currentStep === 1 && !isStep1Valid) ||
                    (currentStep === 2 && !isStep2Valid) ||
                    (currentStep === 3 && !isStep3Valid)
                  }
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Next Step
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!isStep4Valid || isSubmitting}
                  className="px-8 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Application
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </ConnectionStatus>
  );
}
