import React from 'react';
import { X, LayoutTemplate } from 'lucide-react';

interface FloorPlanModalProps {
    onClose: () => void;
}

const FloorPlanModal: React.FC<FloorPlanModalProps> = ({ onClose }) => (
    <div
        className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
    >
        <div
            className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center"
            onClick={(e) => e.stopPropagation()}
        >
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
            >
                <X className="w-4 h-4" />
            </button>

            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <LayoutTemplate className="w-7 h-7 text-blue-600" />
            </div>

            <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">Request Floor Plans</h3>
            <p className="text-slate-500 text-sm font-medium mb-6">
                Our team will reach out with detailed floor plans and availability for this project.
            </p>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-widest">
                Contact form coming soon
            </div>

            <button
                onClick={onClose}
                className="mt-6 w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all"
            >
                Close
            </button>
        </div>
    </div>
);

export default FloorPlanModal;
