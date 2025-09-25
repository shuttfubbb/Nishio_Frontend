import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Circle, Image as KonvaImage, Rect, Text, Arrow } from 'react-konva';
import { useImage } from 'react-konva-utils';
import { Room, AnnotationState, Door, Window, Position } from '../types';
import { Stage as KonvaStage } from 'konva/lib/Stage';
import '../index.css';
import { log } from 'console';

// Fixed color palette
const colors: { [key: string]: string } = {
  door: 'red',
  window: 'blue',
  room: 'black',
};

// Generate a consistent random color for furniture based on item_type
const stringToColor = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  const h = hue / 360;
  const s = 0.7;
  const l = 0.5;
  let r, g, b;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  r = hue2rgb(p, q, h + 1 / 3);
  g = hue2rgb(p, q, h);
  b = hue2rgb(p, q, h - 1 / 3);
  const toHex = (c: number) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

interface CanvasProps {
  image: HTMLImageElement;
  jsonData: Room[] | null;
  scale: number;
  mode: AnnotationState['mode'];
  selectedType: AnnotationState['selectedType'];
  selectedFurniture: string | null;
  onUpdateAnnotations: (jsonData: Room[]) => void;
}

export const Canvas: React.FC<CanvasProps> = ({ image, jsonData, scale, mode, selectedType, selectedFurniture, onUpdateAnnotations }) => {
  const stageRef = useRef<KonvaStage>(null);
  const [konvaImage] = useImage(image.src);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [endPos, setEndPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (stageRef.current) {
      stageRef.current.scaleX(scale);
      stageRef.current.scaleY(scale);
      stageRef.current.draw();
    }
  }, [scale, konvaImage]);

  const getColor = (type: string, index: number): string => {
    return colors[type] || stringToColor(type);
  };

  const handleMouseDown = (e: any) => {
    if (!jsonData || mode !== 'drawBbox' || selectedType !== 'room') return;
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    setStartPos({ x: Math.round(pointer.x / scale), y: Math.round(pointer.y / scale) }); // Store in pixel coordinates
  };

  const handleMouseMove = (e: any) => {
    if (!jsonData || mode !== 'drawBbox' || selectedType !== 'room' || !startPos) return;
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    setEndPos({ x: Math.round(pointer.x / scale), y: Math.round(pointer.y / scale) }); // Store in pixel coordinates
  };

  const handleMouseUp = () => {
    if (!jsonData || mode !== 'drawBbox' || selectedType !== 'room' || !startPos || !endPos) return;
    const newData = [...jsonData];
    // Store pixel coordinates directly
    const xMin = Math.round(Math.min(startPos.x, endPos.x));
    const yMin = Math.round(Math.min(startPos.y, endPos.y));
    const xMax = Math.round(Math.max(startPos.x, endPos.x));
    const yMax = Math.round(Math.max(startPos.y, endPos.y));
    console.log('Setting room dimensions to:', { xmin: xMin, ymin: yMin, xmax: xMax, ymax: yMax });
    newData[0].dimensions = { xmin: xMin, ymin: yMin, xmax: xMax, ymax: yMax };
    onUpdateAnnotations(newData);
    setStartPos(null);
    setEndPos(null);
  };

  const handleClick = (e: any) => {
    if (!jsonData || mode !== 'point' || !selectedType || selectedType === 'room') return;
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    var x = Math.round(pointer.x / scale); // Ensure x is an integer
    var y = Math.round(pointer.y / scale); // Ensure y is an integer
    x = Math.max(x)
    const newData = [...jsonData];

    if (selectedType === 'furniture' && selectedFurniture) {
      const furnitureIndex = newData[0].furniture.findIndex((f) => f.item_code === selectedFurniture);
      console.log('Furniture Index:', furnitureIndex);
      console.log('Furniture Data:', newData[0].furniture[furnitureIndex]);
      newData[0].furniture[furnitureIndex].item_positions.push({ x, y, direction: 0});
    } 
    else if (selectedType === 'door') {
      newData[0].doors.push({ x, y, direction: 0 });
    } 
    else if (selectedType === 'window') {
      newData[0].windows.push({ x, y, direction: 0 });
    }
    onUpdateAnnotations(newData);
  };

  return (
    <div style={{ width: '1400px', height: '700px', overflow: 'scroll', border: '1px solid black' }}>
      <Stage
        width={image.width * scale}
        height={image.height * scale}
        ref={stageRef}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="border"
      >
        <Layer>
          {konvaImage && (
            <KonvaImage image={konvaImage} width={image.width} height={image.height} />
          )}
          {jsonData && jsonData[0] && (
            <>
              {/* Room bounding box */}
              {jsonData[0].dimensions && (
                <Rect
                  x={jsonData[0].dimensions.xmin}
                  y={jsonData[0].dimensions.ymin}
                  width={jsonData[0].dimensions.xmax - jsonData[0].dimensions.xmin}
                  height={jsonData[0].dimensions.ymax - jsonData[0].dimensions.ymin}
                  stroke="black"
                  strokeWidth={2 / scale}
                  dash={undefined} // Solid line
                />
              )}
              {/* Temporary rectangle while drawing */}
              {startPos && endPos && mode === 'drawBbox' && selectedType === 'room' && (
                <Rect
                  x={Math.min(startPos.x, endPos.x)}
                  y={Math.min(startPos.y, endPos.y)}
                  width={Math.abs(endPos.x - startPos.x)}
                  height={Math.abs(endPos.y - startPos.y)}
                  stroke="black"
                  strokeWidth={2 / scale}
                  dash={[10, 5]} // Dashed for temporary
                />
              )}
              {/* Furniture points */}
              {jsonData[0].furniture.map((item, index) =>
                item.item_positions.map((pos: Position, subIndex: number) => (
                  <React.Fragment key={`furniture-${index}-${subIndex}`}>
                    <Circle
                      x={pos.x}
                      y={pos.y}
                      radius={5 / scale}
                      fill={getColor(item.item_code, index)}
                      stroke="black"
                      strokeWidth={1 / scale}
                    />
                    <Arrow
                        x={pos.x}
                        y={pos.y}
                        points={[0, 0, 20, 0]} // mũi tên dài 20px, mặc định hướng lên
                        rotation={pos.direction ?? 0}
                        stroke={getColor(item.item_code, index)}
                        fill={getColor(item.item_code, index)}
                        pointerLength={6}
                        pointerWidth={6}
                      />
                    <Text
                      text={`${subIndex + 1}`}
                      x={pos.x + 5 / scale}
                      y={pos.y + 5 / scale}
                      fontSize={12 / scale}
                      fill={getColor(item.item_code, index)}
                    />
                  </React.Fragment>
                ))
              )}
              {/* Door points */}
              {jsonData[0].doors.map((position: Door, index: number) => (
                <React.Fragment key={`door-${index}`}>
                  <Circle
                    x={position.x}
                    y={position.y}
                    radius={5 / scale}
                    fill={getColor('door', index)}
                    stroke="black"
                    strokeWidth={1 / scale}
                  />
                  <Arrow
                    x={position.x}
                    y={position.y}
                    points={[0, 0, 20, 0]}
                    rotation={position.direction ?? 0}
                    stroke={getColor('door', index)}
                    fill={getColor('door', index)}
                    pointerLength={6}
                    pointerWidth={6}
                  />
                  <Text
                    text={`${index + 1}`}
                    x={position.x + 5 / scale}
                    y={position.y + 5 / scale}
                    fontSize={12 / scale}
                    fill={getColor('door', index)}
                  />
                </React.Fragment>
              ))}
              {/* Window points */}
              {jsonData[0].windows.map((position: Window, index: number) => (
                <React.Fragment key={`window-${index}`}>
                  <Circle
                    x={position.x}
                    y={position.y}
                    radius={5 / scale}
                    fill={getColor('window', index)}
                    stroke="black"
                    strokeWidth={1 / scale}
                  />
                  <Arrow
                    x={position.x}
                    y={position.y}
                    points={[0, 0, 20, 0]}
                    rotation={position.direction ?? 0}
                    stroke={getColor('door', index)}
                    fill={getColor('door', index)}
                    pointerLength={6}
                    pointerWidth={6}
                  />
                  <Text
                    text={`${index + 1}`}
                    x={position.x + 5 / scale}
                    y={position.y + 5 / scale}
                    fontSize={12 / scale}
                    fill={getColor('window', index)}
                  />
                </React.Fragment>
              ))}
            </>
          )}
        </Layer>
      </Stage>
    </div>
  );
};