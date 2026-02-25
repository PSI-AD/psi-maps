import React, { useState } from 'react';
import { X, Flag } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';
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
    'Other',
];

const ReportModal: React.FC<Props> = ({ project, onClose }) => {
    const [reason, setReason] = useState(REASONS[0]);
    const [details, setDetails] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'mail'), {
                to: 'propertyshopinvest@gmail.com',
                message: {
                    subject: `🚩 Project Report: ${project.name}`,
                    html: `
                        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
                            <div style="background:#1e293b;padding:20px;text-align:center;">
                                <h2 style="color:#fff;margin:0;">PSI MAPS</h2>
                                <p style="color:#94a3b8;margin:4px 0 0;">Internal Moderation Alert</p>
                            </div>
                            <div style="padding:30px;background:#fff;">
                                <h3 style="color:#0f172a;border-bottom:2px solid #f1f5f9;padding-bottom:10px;">
                                    Flagged Project: ${project.name}
                                </h3>
                                <p><strong>Issue Category:</strong> <span style="color:#ef4444;">${reason}</span></p>
                                <p><strong>Developer:</strong> ${project.developerName}</p>
                                <p><strong>Location:</strong> ${[project.community, project.city].filter(Boolean).join(', ')}</p>
                                <p><strong>User Comments:</strong></p>
                                <div style="background:#f8fafc;padding:15px;border-left:4px solid #ef4444;color:#475569;">
                                    ${details || 'No additional details provided.'}
                                </div>
                            </div>
                            <div style="background:#f1f5f9;padding:15px;text-align:center;font-size:12px;color:#64748b;">
                                &copy; 2026 Property Shop Investment. All rights reserved.
                            </div>
                        </div>
                    `,
                },
                projectRef: project.id,
                status: 'pending',
                createdAt: serverTimestamp(),
            });
            alert('Report submitted successfully. The team has been notified.');
            onClose();
        } catch (error) {
            console.error('Error submitting report:', error);
            alert('Failed to submit report. Please try again.');
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
                        <Flag className="w-4 h-4 text-red-500" />
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

                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black uppercase text-sm tracking-widest shadow-md transition-colors disabled:opacity-50"
                    >
                        {isSubmitting ? 'Sending…' : 'Submit Report'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReportModal;
