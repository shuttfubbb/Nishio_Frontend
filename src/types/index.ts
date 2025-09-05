export interface Room {
  room_name: string;
  purpose: string;
  shape: string;
  dimensions: { xmin: number; ymin: number; xmax: number; ymax: number } | null;
  doors: { quantity: number; positions: [number, number][] };
  windows: { quantity: number; positions: [number, number][] };
  school_type: string;
  student_num: number;
  furniture: {
    item_type: string;
    item_code: string;
    item_quantity: number;
    item_positions: [number, number][];
  }[];
  image?: { filename: string; width: number; height: number };
}

export interface AnnotationState {
  jsonData: Room[] | null;
  image: HTMLImageElement[] | null;
  scale: number;
  mode: 'none' | 'drawBbox' | 'point';
  selectedType: 'room' | 'door' | 'window' | 'furniture' | null;
  selectedFurniture: string | null;
}