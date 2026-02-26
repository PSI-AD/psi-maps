import React, { useState, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Play, Pause, RotateCw } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Zoom, A11y, Autoplay, Keyboard } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/zoom';

interface LightboxGalleryProps {
    images: string[];
    initialIndex: number;
    onClose: () => void;
}

const LightboxGallery: React.FC<LightboxGalleryProps> = ({ images, initialIndex, onClose }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [rotation, setRotation] = useState(0);
    const swiperRef = useRef<SwiperType | null>(null);

    if (!images || images.length === 0) return null;

    const togglePlay = () => {
        if (swiperRef.current) {
            if (isPlaying) {
                swiperRef.current.autoplay.stop();
            } else {
                swiperRef.current.autoplay.start();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleRotate = () => {
        setRotation((prev) => prev + 90);
    };

    // Reset rotation on slide change so the next image starts normally
    const onSlideChange = () => {
        setRotation(0);
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col animate-in fade-in duration-200 backdrop-blur-sm">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 bg-black/40 backdrop-blur-md text-white z-50 relative">
                <div className="flex items-center gap-4">
                    <span className="text-sm font-bold opacity-80">{initialIndex + 1} / {images.length}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={togglePlay} className="p-2 rounded-full hover:bg-white/20 transition-colors" title={isPlaying ? "Pause Slideshow" : "Play Slideshow"}>
                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </button>
                    <button onClick={handleRotate} className="p-2 rounded-full hover:bg-white/20 transition-colors md:hidden" title="Rotate Image">
                        <RotateCw className="w-5 h-5" />
                    </button>
                    <div className="w-px h-6 bg-white/20 mx-2 hidden md:block"></div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20 transition-colors bg-white/10" title="Close Gallery">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Main Swiper Container */}
            <div className="flex-1 relative overflow-hidden h-full w-full">
                {/* Custom Navigation Buttons */}
                <button className="absolute left-2 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-black/30 text-white hover:bg-black/50 transition-all md:flex hidden swiper-button-prev-custom">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <button className="absolute right-2 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-black/30 text-white hover:bg-black/50 transition-all md:flex hidden swiper-button-next-custom">
                    <ChevronRight className="w-6 h-6" />
                </button>

                <Swiper
                    modules={[Navigation, Zoom, A11y, Autoplay, Keyboard]}
                    spaceBetween={20}
                    slidesPerView={1}
                    initialSlide={initialIndex}
                    zoom={{ maxRatio: 3 }}
                    loop={images.length > 1}
                    keyboard={{ enabled: true }}
                    autoplay={{ delay: 3000, disableOnInteraction: false, pauseOnMouseEnter: true }}
                    onSwiper={(swiper) => {
                        swiperRef.current = swiper;
                        swiper.autoplay.stop(); // Start paused
                    }}
                    onSlideChange={onSlideChange}
                    navigation={{
                        prevEl: '.swiper-button-prev-custom',
                        nextEl: '.swiper-button-next-custom',
                    }}
                    className="h-full w-full"
                >
                    {images.map((img, idx) => (
                        <SwiperSlide key={idx} className="flex items-center justify-center h-full w-full overflow-hidden">
                            <div className="swiper-zoom-container h-full w-full flex items-center justify-center p-4 md:p-8">
                                <img
                                    src={img}
                                    alt={`Gallery image ${idx + 1}`}
                                    className="max-h-full max-w-full object-contain transition-transform duration-300 ease-out rounded-lg shadow-2xl"
                                    style={{ transform: `rotate(${rotation}deg)` }}
                                />
                            </div>
                        </SwiperSlide>
                    ))}
                </Swiper>
            </div>
        </div>
    );
};

export default LightboxGallery;
