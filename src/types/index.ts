export interface Room {
  room_name: string;
  room_type: string | '';
  shape: string;
  dimensions: { xmin: number; ymin: number; xmax: number; ymax: number };
  w: number;
  d: number;
  doors: Point[];
  windows: Point[];
  school_type: string | '';
  maximum_occupancy: number;
  furniture: {
    item_code: string;
    item_positions: Point[];
  }[];
}


export interface Point{
  x: number;
  y: number;
}

export interface AnnotationState {
  jsonData: Room[] | null;
  image: HTMLImageElement[] | null;
  scale: number;
  mode: 'none' | 'drawBbox' | 'point';
  selectedType: 'room' | 'door' | 'window' | 'furniture' | null;
  selectedFurniture: string | null;
  fileNames: string[];
}