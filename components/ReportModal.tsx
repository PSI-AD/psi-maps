import React, { useState } from 'react';
import { X, Flag, Loader2, CheckCircle } from 'lucide-react';
import { submitLead } from '../utils/emailService';
import { Project } from '../types';

interface Props {
    project: Project;
    onClose: () => void;
}

const REASONS = [
    'Incorrect Price',
    'Incorrect Location / Map Pin',
    'Wrong Developer or Status',
    'Outdated Images',
    'Suggestions',
    'Other',
];

const ReportModal: React.FC<Props> = ({ project, onClose }) => {
    const [reason, setReason] = useState(REASONS[0]);
    const [details, setDetails] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [submitError, setSubmitError] = useState('');

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setSubmitError('');
        try {
            const result = await submitLead({
                formType: 'general_contact',
                projectName: project.name,
                community: project.community,
                developer: project.developerName,
                firstName: 'Report',
                lastName: reason,
                email: 'report@psi-maps.com',
                phone: '',
                message: `🚩 ISSUE REPORT — ${reason}\n\nProject: ${project.name}\nDeveloper: ${project.developerName || 'N/A'}\nLocation: ${[project.community, project.city].filter(Boolean).join(', ')}\n\nDetails:\n${details || 'No additional details provided.'}`,
            });

            if (result.success) {
                setSubmitted(true);
            } else {
                setSubmitError(result.error || 'Failed to submit. Please try again.');
            }
        } catch (error) {
            console.error('Error submitting report:', error);
            setSubmitError('Failed to submit report. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm flex items-center gap-2">
                        <Flag className="w-4 h-4 text-orange-500" />
                        Report Issue
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 text-slate-400 hover:text-slate-800 transition-colors"
                        aria-label="Close report modal"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    {submitted ? (
                        <div className="text-center py-6">
                            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-7 h-7 text-emerald-600" />
                            </div>
                            <h4 className="text-lg font-black text-slate-900 mb-2">Report Submitted</h4>
                            <p className="text-sm text-slate-500">
                                Thank you! Our team has been notified about <strong>{project.name}</strong>.
                            </p>
                            <button
                                onClick={onClose}
                                className="mt-5 w-full py-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-black uppercase text-xs tracking-widest transition-all"
                            >
                                Done
                            </button>
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    Issue Type
                                </label>
                                <select
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors"
                                >
                                    {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    Additional Details
                                </label>
                                <textarea
                                    value={details}
                                    onChange={e => setDetails(e.target.value)}
                                    placeholder="Please explain what needs to be fixed…"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-500 transition-colors min-h-[120px] resize-none"
                                />
                            </div>

                            {submitError && (
                                <p className="text-sm text-rose-500 font-bold text-center">{submitError}</p>
                            )}

                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white rounded-xl font-black uppercase text-sm tracking-widest shadow-md transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                                ) : (
                                    'Submit Report'
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReportModal;
