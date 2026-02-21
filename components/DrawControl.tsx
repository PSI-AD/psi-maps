import * as MapboxDrawImport from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { useControl } from 'react-map-gl';
import type { ControlPosition } from 'react-map-gl';

interface DrawControlProps {
  position?: ControlPosition;
  onCreate?: (evt: { features: object[] }) => void;
  onUpdate?: (evt: { features: object[]; action: string }) => void;
  onDelete?: (evt: { features: object[] }) => void;
  onReference?: (draw: any) => void;
}

const DrawControl = (props: DrawControlProps) => {
  const draw = useControl<any>(
    () => {
      try {
        const DrawClass = (MapboxDrawImport as any).default
          ? (MapboxDrawImport as any).default
          : MapboxDrawImport;
        if (typeof DrawClass !== 'function') {
          console.warn('MapboxDraw: constructor not found, draw control disabled.');
          return {} as any;
        }
        return new (DrawClass as any)({
          displayControlsDefault: false,
          controls: {},
          defaultMode: 'simple_select'
        });
      } catch (e) {
        console.warn('Draw control initialization bypassed safely:', e);
        return {} as any;
      }
    },
    ({ map }) => {
      if (props.onCreate) map.on('draw.create', props.onCreate);
      if (props.onUpdate) map.on('draw.update', props.onUpdate);
      if (props.onDelete) map.on('draw.delete', props.onDelete);
      if (props.onReference) props.onReference(draw);
    },
    ({ map }) => {
      if (props.onCreate) map.off('draw.create', props.onCreate);
      if (props.onUpdate) map.off('draw.update', props.onUpdate);
      if (props.onDelete) map.off('draw.delete', props.onDelete);
    },
    { position: props.position }
  );

  return null;
};

DrawControl.defaultProps = {
  onCreate: () => { },
  onUpdate: () => { },
  onDelete: () => { }
};

export default DrawControl;
