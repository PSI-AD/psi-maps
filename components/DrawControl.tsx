
import MapboxDrawImport from '@mapbox/mapbox-gl-draw';
import { useControl } from 'react-map-gl';
import type { ControlPosition } from 'react-map-gl';

// Fix CJS interop: In production builds, Vite may wrap the CJS module differently
const MapboxDraw = (MapboxDrawImport as any).default || MapboxDrawImport;

interface DrawControlProps {
  position?: ControlPosition;
  onCreate?: (evt: { features: object[] }) => void;
  onUpdate?: (evt: { features: object[]; action: string }) => void;
  onDelete?: (evt: { features: object[] }) => void;
  onReference?: (draw: any) => void;
}

const DrawControl = (props: DrawControlProps) => {
  const draw = useControl<any>(
    () => new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true
      },
      defaultMode: 'simple_select'
    }),
    ({ map }) => {
      map.on('draw.create', props.onCreate!);
      map.on('draw.update', props.onUpdate!);
      map.on('draw.delete', props.onDelete!);
      if (props.onReference) props.onReference(draw);
    },
    ({ map }) => {
      map.off('draw.create', props.onCreate!);
      map.off('draw.update', props.onUpdate!);
      map.off('draw.delete', props.onDelete!);
    },
    {
      position: props.position
    }
  );

  return null;
};

DrawControl.defaultProps = {
  onCreate: () => { },
  onUpdate: () => { },
  onDelete: () => { }
};

export default DrawControl;
