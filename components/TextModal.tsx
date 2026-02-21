import React from 'react';
import { X } from 'lucide-react';

interface TextModalProps {
    text: string;
    onClose: () => void;
}

const TextModal: React.FC<TextModalProps> = ({ text, onClose }) => (
    <div
        className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
    >
        <div
            className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-[90%] max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">About The Project</h3>
                <button
                    onClick={onClose}
                    className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Body */}
            <div
                className="px-6 py-6 prose prose-sm text-slate-600 leading-relaxed max-w-none prose-p:mb-3 prose-strong:text-slate-900"
                dangerouslySetInnerHTML={{ __html: text }}
            />
        </div>
    </div>
);

export default TextModal;
