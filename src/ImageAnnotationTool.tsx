// ImageAnnotationTool.tsx
import React, { useRef, useState } from 'react';
import { Stage, Layer, Rect, Image as KonvaImage, Circle, Text } from 'react-konva';
import useImage from 'use-image';

interface FurniturePosition {
  item_type: string;
  x: number;
  y: number;
}

const furnitureList = [
  '定番用シューズボックス',
  '傘立て',
  '教師用シューズボックス',
  '掃除用具入れ',
];

const ImageAnnotationTool = () => {
  const [imageURL, setImageURL] = useState<string | null>(null);
  const [selectedFurniture, setSelectedFurniture] = useState<string>(furnitureList[0]);
  const [positions, setPositions] = useState<FurniturePosition[]>([]);
  const [bbox, setBbox] = useState<any>(null);
  const [drawingBox, setDrawingBox] = useState<boolean>(false);
  const [startBox, setStartBox] = useState<{ x: number; y: number } | null>(null);

  const [image] = useImage(imageURL || '', 'anonymous');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setImageURL(URL.createObjectURL(file));
  };

  const handleClick = (e: any) => {
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    if (!drawingBox) {
      setPositions([...positions, { item_type: selectedFurniture, x: pointer.x, y: pointer.y }]);
    }
  };

  const handleMouseDown = (e: any) => {
    if (drawingBox) {
      const pos = e.target.getStage().getPointerPosition();
      setStartBox(pos);
    }
  };

  const handleMouseUp = (e: any) => {
    if (drawingBox && startBox) {
      const end = e.target.getStage().getPointerPosition();
      const box = {
        x: Math.min(startBox.x, end.x),
        y: Math.min(startBox.y, end.y),
        width: Math.abs(startBox.x - end.x),
        height: Math.abs(startBox.y - end.y),
      };
      setBbox(box);
      setStartBox(null);
      setDrawingBox(false);
    }
  };

  const exportJSON = () => {
    const data = {
      room_bbox: bbox,
      furniture: positions,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'annotation.json';
    link.click();
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-2">Annotation Tool</h2>
      <input type="file" accept="image/*" onChange={handleFileChange} />
      <div className="my-2">
        <label>Loại nội thất: </label>
        <select
          value={selectedFurniture}
          onChange={(e) => setSelectedFurniture(e.target.value)}
          className="border p-1"
        >
          {furnitureList.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <button
          className="ml-4 px-2 py-1 bg-blue-500 text-white rounded"
          onClick={() => setDrawingBox(true)}
        >
          Vẽ BBox
        </button>
        <button
          className="ml-2 px-2 py-1 bg-green-600 text-white rounded"
          onClick={exportJSON}
        >
          Xuất JSON
        </button>
      </div>
      <Stage
        width={800}
        height={600}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        className="border"
      >
        <Layer>
          {image && <KonvaImage image={image} width={800} height={600} />}
          {bbox && (
            <Rect
              x={bbox.x}
              y={bbox.y}
              width={bbox.width}
              height={bbox.height}
              stroke="red"
              strokeWidth={2}
            />
          )}
          {positions.map((f, i) => (
            <>
              <Circle key={i} x={f.x} y={f.y} radius={5} fill="blue" />
              <Text text={f.item_type} x={f.x + 5} y={f.y + 5} fontSize={12} />
            </>
          ))}
        </Layer>
      </Stage>
    </div>
  );
};

export default ImageAnnotationTool;
