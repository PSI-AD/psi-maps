import React from 'react';
import { X } from 'lucide-react';

interface FullscreenImageModalProps {
    imageUrl: string;
    onClose: () => void;
}

const FullscreenImageModal: React.FC<FullscreenImageModalProps> = ({ imageUrl, onClose }) => (
    <div
        className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
    >
        <button
            className="absolute top-6 right-6 text-white p-2 bg-white/10 hover:bg-white/25 rounded-full transition-colors z-10"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
        >
            <X className="w-6 h-6" />
        </button>
        <img
            src={imageUrl}
            alt="Fullscreen Property"
            className="max-w-[90%] max-h-[90vh] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
        />
    </div>
);

export default FullscreenImageModal;
