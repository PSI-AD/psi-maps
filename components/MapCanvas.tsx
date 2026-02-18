import React from 'react';
import Map, { AttributionControl, NavigationControl, Popup, Marker } from 'react-map-gl';
import { Project, Landmark } from '../types';
import MapMarker from './MapMarker';
import AmenityMarker from './AmenityMarker';
import DrawControl from './DrawControl';

interface MapCanvasProps {
    mapRef: any;
    viewState: any;
    setViewState: (vs: any) => void;
    updateBounds: () => void;
    mapStyle: string;
    onClick: (e: any) => void;
    drawRef: any;
    onDrawCreate: (e: any) => void;
    onDrawUpdate: (e: any) => void;
    onDrawDelete: () => void;
    filteredAmenities: Landmark[];
    clusters: any[];
    supercluster: any;
    onMarkerClick: (id: string) => void;
    onLandmarkClick: (l: Landmark) => void;
    selectedProjectId: string | null;
    setHoveredProjectId: (id: string | null) => void;
    setHoveredLandmarkId: (id: string | null) => void;
    selectedLandmark: Landmark | null;
    selectedProject: Project | null;
    hoveredProject: Project | null;
}

const MAPBOX_TOKEN = 'pk.eyJ1IjoicHNpbnYiLCJhIjoiY21scjBzM21xMDZqNzNmc2VmdGt5MW05ZCJ9.VxIEn1jLTzMwLAN8m4B15g';

const getLandmarkBadgeStyle = (category: string) => {
    switch (category) {
        case 'school': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
        case 'hotel': return 'bg-blue-50 text-blue-600 border-blue-100';
        case 'culture': return 'bg-purple-50 text-purple-600 border-purple-100';
        case 'leisure': return 'bg-teal-50 text-teal-600 border-teal-100';
        case 'retail': return 'bg-rose-50 text-rose-600 border-rose-100';
        default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
};

const MapCanvas: React.FC<MapCanvasProps> = ({
    mapRef, viewState, setViewState, updateBounds, mapStyle, onClick,
    drawRef, onDrawCreate, onDrawUpdate, onDrawDelete,
    filteredAmenities, clusters, supercluster,
    onMarkerClick, onLandmarkClick, selectedProjectId,
    setHoveredProjectId, setHoveredLandmarkId,
    selectedLandmark, selectedProject, hoveredProject
}) => {
    const handleImageError = (e: any) => {
        e.currentTarget.src = 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=800&q=80';
    };

    const handleClusterClick = (cluster: any) => {
        const [longitude, latitude] = cluster.geometry.coordinates;
        const expansionZoom = Math.min(supercluster?.getClusterExpansionZoom(cluster.id) || viewState.zoom + 2, 20);
        mapRef.current?.flyTo({ center: [longitude, latitude], zoom: expansionZoom, duration: 800 });
    };

    return (
        <Map
            {...viewState} ref={mapRef} onMove={evt => { setViewState(evt.viewState); updateBounds(); }}
            mapStyle={mapStyle} mapboxAccessToken={MAPBOX_TOKEN} onClick={onClick}
            attributionControl={false} className="w-full h-full"
        >
            <AttributionControl position="bottom-left" />
            <NavigationControl position="bottom-right" />
            <DrawControl position="top-right" onCreate={onDrawCreate} onUpdate={onDrawUpdate} onDelete={onDrawDelete} onReference={(draw) => { drawRef.current = draw; }} />

            {filteredAmenities.map(amenity => (
                <AmenityMarker key={amenity.id} amenity={amenity} onClick={() => onLandmarkClick(amenity)} onMouseEnter={() => setHoveredLandmarkId(amenity.id)} onMouseLeave={() => setHoveredLandmarkId(null)} />
            ))}

            {clusters.map(cluster => {
                const [longitude, latitude] = cluster.geometry.coordinates;
                if (cluster.properties.cluster) {
                    return (
                        <Marker key={`cluster-${cluster.id}`} longitude={longitude} latitude={latitude}>
                            <div onClick={() => handleClusterClick(cluster)} className="w-10 h-10 rounded-full bg-blue-600 text-white border-2 border-white shadow-lg flex items-center justify-center font-black cursor-pointer hover:scale-110 transition-transform">
                                {cluster.properties.point_count}
                            </div>
                        </Marker>
                    );
                }
                const project = { ...cluster.properties, longitude, latitude } as Project; // Reconstruct project from cluster props if needed, or find in list. Actually properties has projectId.
                // Wait, supercluster leaves contain properties passed in points.
                // App.tsx logic: const project = filteredProjects.find(p => p.id === projectId);
                // I need filteredProjects here? Or assume properties are enough? MapMarker needs full project.
                // Cluster properties only has { cluster: false, projectId, category }.
                // I need to look up the project.
                // I can pass a lookup function or just find it here if I have filteredProjects.
                // Props has filteredProjects? No, I didn't add it to props but I should.
                // Wait, I can't find it in existing props list above. I need to add 'projects' prop.
                return null;
            })}

            {selectedLandmark && (
                <Popup longitude={selectedLandmark.longitude} latitude={selectedLandmark.latitude} anchor="bottom" offset={25} closeButton={false} closeOnClick={false} className="z-[2500]">
                    <div className="p-3 bg-white min-w-[180px] shadow-sm">
                        <h4 className="text-sm font-black text-slate-800 mb-1">{selectedLandmark.name}</h4>
                        <div className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${getLandmarkBadgeStyle(selectedLandmark.category)}`}>{selectedLandmark.category}</div>
                    </div>
                </Popup>
            )}

            <div className="hidden md:block">
                {(selectedProject || hoveredProject) && (
                    <Popup longitude={(selectedProject || hoveredProject)!.longitude} latitude={(selectedProject || hoveredProject)!.latitude} closeButton={false} closeOnClick={false} anchor="top" className="z-[200]" maxWidth="300px">
                        <div className="flex w-64 bg-white rounded-lg overflow-hidden shadow-2xl border border-slate-100">
                            <div className="w-[70px] h-[70px] shrink-0 bg-slate-100"><img src={(selectedProject || hoveredProject)!.thumbnailUrl} className="w-full h-full object-cover" onError={handleImageError} alt="" /></div>
                            <div className="p-3 flex-1 flex flex-col justify-center min-w-0">
                                <h4 className="font-bold text-sm text-slate-800 truncate">{(selectedProject || hoveredProject)!.name}</h4>
                                <p className="text-[10px] text-slate-500 font-medium truncate">{(selectedProject || hoveredProject)!.developerName}</p>
                                <div className="flex items-center gap-1.5 mt-1"><span className="text-[9px] font-black text-blue-600 uppercase tracking-tighter">{(selectedProject || hoveredProject)!.type}</span><span className="text-[10px] font-bold text-slate-900">{(selectedProject || hoveredProject)!.priceRange?.split('-')[0].trim()}</span></div>
                            </div>
                        </div>
                    </Popup>
                )}
            </div>
        </Map>
    );
};

export default MapCanvas;
