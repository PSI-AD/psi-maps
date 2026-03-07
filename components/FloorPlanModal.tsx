import React, { useState } from 'react';
import { X, LayoutTemplate, Send, Loader2, ChevronDown } from 'lucide-react';
import { submitLead } from '../utils/emailService';

interface FloorPlanModalProps {
    projectName: string;
    community?: string;
    developer?: string;
    onClose: () => void;
}

const COUNTRY_CODES = [
    { code: '+971', flag: '🇦🇪', name: 'UAE' },
    { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia' },
    { code: '+974', flag: '🇶🇦', name: 'Qatar' },
    { code: '+965', flag: '🇰🇼', name: 'Kuwait' },
    { code: '+973', flag: '🇧🇭', name: 'Bahrain' },
    { code: '+968', flag: '🇴🇲', name: 'Oman' },
    { code: '+44', flag: '🇬🇧', name: 'UK' },
    { code: '+1', flag: '🇺🇸', name: 'USA' },
    { code: '+91', flag: '🇮🇳', name: 'India' },
    { code: '+92', flag: '🇵🇰', name: 'Pakistan' },
    { code: '+20', flag: '🇪🇬', name: 'Egypt' },
    { code: '+7', flag: '🇷🇺', name: 'Russia' },
];

const FloorPlanModal: React.FC<FloorPlanModalProps> = ({ projectName, community, developer, onClose }) => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [countryCode, setCountryCode] = useState('+971');
    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = () => {
        const e: Record<string, string> = {};
        if (!firstName.trim()) e.firstName = 'Required';
        if (!lastName.trim()) e.lastName = 'Required';
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Valid email required';
        if (!phone || phone.length < 7) e.phone = 'Valid phone number required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setIsSubmitting(true);
        setSubmitError('');

        const result = await submitLead({
            formType: 'floor_plan_request',
            projectName,
            community,
            developer,
            firstName,
            lastName,
            email,
            phone: `${countryCode}${phone}`,
            message: `Client is requesting detailed floor plans and availability for ${projectName}.`,
        });

        setIsSubmitting(false);
        if (result.success) {
            setSubmitted(true);
        } else {
            setSubmitError(result.error || 'Failed to send. Please try again.');
        }
    };

    const inputBase = 'w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-slate-800 font-medium text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all';
    const errorClass = 'text-[11px] text-rose-500 font-bold mt-1';

    return (
        <div
            className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 animate-in slide-in-from-bottom-4 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {submitted ? (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-2">Request Received!</h3>
                        <p className="text-sm text-slate-500">
                            Our team will send you the detailed floor plans for <strong>{projectName}</strong> shortly.
                        </p>
                        <button
                            onClick={onClose}
                            className="mt-6 w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all"
                        >
                            Done
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} noValidate>
                        {/* Header */}
                        <div className="mb-6">
                            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
                                <LayoutTemplate className="w-6 h-6 text-blue-600" />
                            </div>
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1">Floor Plan Request</p>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight leading-tight">
                                Request Floor Plans
                                <br />
                                <span className="text-blue-600 truncate block max-w-[85%] text-lg">{projectName}</span>
                            </h2>
                            <p className="text-xs text-slate-400 mt-2">Fill in your details and our team will share the available floor plans with you.</p>
                        </div>

                        {/* Name Row */}
                        <div className="flex gap-3 mb-3">
                            <div className="flex-1">
                                <input type="text" placeholder="First Name" value={firstName}
                                    onChange={e => setFirstName(e.target.value)}
                                    className={`${inputBase} ${errors.firstName ? 'border-rose-400 focus:ring-rose-400' : ''}`}
                                />
                                {errors.firstName && <p className={errorClass}>{errors.firstName}</p>}
                            </div>
                            <div className="flex-1">
                                <input type="text" placeholder="Last Name" value={lastName}
                                    onChange={e => setLastName(e.target.value)}
                                    className={`${inputBase} ${errors.lastName ? 'border-rose-400 focus:ring-rose-400' : ''}`}
                                />
                                {errors.lastName && <p className={errorClass}>{errors.lastName}</p>}
                            </div>
                        </div>

                        {/* Email */}
                        <div className="mb-3">
                            <input type="email" placeholder="Email Address" value={email}
                                onChange={e => setEmail(e.target.value)}
                                className={`${inputBase} ${errors.email ? 'border-rose-400 focus:ring-rose-400' : ''}`}
                            />
                            {errors.email && <p className={errorClass}>{errors.email}</p>}
                        </div>

                        {/* Phone */}
                        <div className="mb-5">
                            <div className={`flex h-11 border rounded-xl overflow-hidden transition-all focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-400 ${errors.phone ? 'border-rose-400' : 'border-slate-200'}`}>
                                <div className="relative shrink-0">
                                    <select value={countryCode} onChange={e => setCountryCode(e.target.value)}
                                        className="h-full pl-3 pr-7 bg-slate-50 text-slate-700 font-bold text-sm outline-none appearance-none cursor-pointer border-r border-slate-200">
                                        {COUNTRY_CODES.map(c => (
                                            <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                                </div>
                                <input type="tel" placeholder="5X XXX XXXX" value={phone}
                                    onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                                    maxLength={15}
                                    className="flex-1 px-4 bg-white text-slate-800 font-medium text-sm outline-none"
                                />
                            </div>
                            {errors.phone && <p className={errorClass}>{errors.phone}</p>}
                        </div>

                        {/* Error */}
                        {submitError && (
                            <p className="text-sm text-rose-500 font-bold text-center mb-3">{submitError}</p>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-4 bg-blue-800 hover:bg-blue-900 disabled:bg-blue-400 text-white rounded-xl font-black text-xs uppercase tracking-[0.15em] transition-all shadow-lg flex items-center justify-center gap-2 active:scale-[0.99] disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                            ) : (
                                <><Send className="w-4 h-4" /> Request Floor Plans</>
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default FloorPlanModal;
