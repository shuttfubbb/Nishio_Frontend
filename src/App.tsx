import React, { useState, useRef } from 'react';
import { useImage } from 'react-konva-utils';
import { Room, AnnotationState } from './types';
import { saveJson } from './utils/jsonHandler';
import { Canvas } from './components/Canvas';
import { Sidebar } from './components/Sidebar';
import { Stage as KonvaStage } from 'konva/lib/Stage';
import './index.css';

const App: React.FC = () => {
  const [state, setState] = useState<AnnotationState>({
    jsonData: null,
    image: null,
    scale: 1.0,
    mode: 'none',
    selectedType: null,
    selectedFurniture: null,
  });
  const [imageURL, setImageURL] = useState<string[]>([]);
  const [furnitureList, setFurnitureList] = useState<string[]>([]);
  const [newFurnitureType, setNewFurnitureType] = useState<string>('');
  const [newFurnitureCode, setNewFurnitureCode] = useState<string>('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const stageRef = useRef<KonvaStage>(null);
  const [image] = useImage(imageURL[currentImageIndex] || '', 'anonymous');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newUrls: string[] = [];
      const images: HTMLImageElement[] = [];
      Array.from(files).forEach((file) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.src = url;
        img.onload = () => {
          images.push(img);
          newUrls.push(url);
          if (images.length === files.length) {
            setState((prev) => ({ ...prev, image: images }));
            setImageURL(newUrls);
            setCurrentImageIndex(0);
          }
        };
      });
    }
  };

  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      alert('No file selected');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonData = JSON.parse(event.target?.result as string) as Room[];
        if (!jsonData || !Array.isArray(jsonData) || jsonData.length === 0) {
          throw new Error('JSON must be a non-empty array');
        }

        // Get image dimensions for validation
        const imageWidth = state.image?.[currentImageIndex]?.width || jsonData[0]?.image?.width || 1;
        const imageHeight = state.image?.[currentImageIndex]?.height || jsonData[0]?.image?.height || 1;

        // Validate and process JSON
        const newData = [...jsonData];
        const room = newData[0];

        const codes = room.furniture?.map((f) => f.item_code) || [];
        const duplicates = codes.filter(
          (code, idx) => codes.indexOf(code) !== idx
        );
        if (duplicates.length > 0) {
          const uniqueDuplicates = Array.from(new Set(duplicates));
          const msg =
            `Duplicate furniture codes detected: ${uniqueDuplicates.join(", ")}.\n` +
            "Do you want to continue importing this JSON?";
          const proceed = window.confirm(msg);
          if (!proceed) {
            return;
          }
        }

        const allowedShapes = ['rectangle', 'circle'];
        room.shape = allowedShapes.includes(room.shape) ? room.shape : 'other';


        // Ensure required fields
        if (!room.doors) room.doors = { quantity: 0, positions: [] };
        if (!room.windows) room.windows = { quantity: 0, positions: [] };
        if (!room.furniture) room.furniture = [];

        // Validate dimensions
        if (room.dimensions) {
          const { xmin, ymin, xmax, ymax } = room.dimensions;
          if (
            xmin < 0 || ymin < 0 || xmax > imageWidth || ymax > imageHeight ||
            xmax < xmin || ymax < ymin
          ) {
            throw new Error(
              `Invalid dimensions: Must be 0 <= xmin <= ${imageWidth}, 0 <= ymin <= ${imageHeight}, ` +
              `xmax >= xmin, ymax >= ymin`
            );
          }
        }

        // Validate positions (doors, windows, furniture) as pixel coordinates
        const validatePositions = (positions: [number, number][], type: string) => {
          positions.forEach((pos, index) => {
            if (
              !Array.isArray(pos) || pos.length !== 2 ||
              !Number.isInteger(pos[0]) || !Number.isInteger(pos[1]) ||
              pos[0] < 0 || pos[0] > imageWidth || pos[1] < 0 || pos[1] > imageHeight
            ) {
              throw new Error(
                `Invalid ${type} position at index ${index}: Must be [x, y] with ` +
                `0 <= x <= ${imageWidth}, 0 <= y <= ${imageHeight}, and both x and y must be integers.`
              );
            }
          });
        };
        validatePositions(room.doors.positions, 'door');
        validatePositions(room.windows.positions, 'window');
        room.furniture.forEach((f, i) => {
          if (!f.item_type || !f.item_code || typeof f.item_quantity !== 'number') {
            throw new Error(`Invalid furniture at index ${i}: Missing item_type, item_code, or item_quantity`);
          }
          if (f.item_quantity !== f.item_positions.length) {
            throw new Error(
              `Furniture ${f.item_code} quantity (${f.item_quantity}) does not match ` +
              `positions (${f.item_positions.length})`
            );
          }
          validatePositions(f.item_positions, `furniture ${f.item_code}`);
        });

        // Update furniture list
        const jsonFurnitureCodes: string[] = room.furniture.map((f) => f.item_code).filter((t) => typeof t === 'string');
        const uniqueFurnitureCodes: string[] = Array.from(new Set([...furnitureList, ...jsonFurnitureCodes]));
        setFurnitureList(uniqueFurnitureCodes);

        setState((prev) => ({ ...prev, jsonData: newData }));
      } catch (error) {
        console.error('Error processing JSON:', error);
        alert(`Invalid JSON file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
    reader.readAsText(file);
  };

  const handleAddFurnitureType = () => {
    if (newFurnitureType && newFurnitureCode && !furnitureList.includes(newFurnitureCode)) {
      setFurnitureList([...furnitureList, newFurnitureCode]);
      const newData: Room[] = state.jsonData
        ? [...state.jsonData]
        : [{
            room_name: 'New Room',
            purpose: 'unknown',
            shape: 'rectangle',
            dimensions: null,
            doors: { quantity: 0, positions: [] },
            windows: { quantity: 0, positions: [] },
            school_type: 'unknown',
            student_num: 0,
            furniture: [],
            image: { filename: '', width: 0, height: 0 },
          }];
      newData[0].furniture.push({
        item_type: newFurnitureType,
        item_code: newFurnitureCode,
        item_quantity: 0,
        item_positions: [],
      });
      setState((prev) => ({ ...prev, jsonData: newData, selectedType: 'furniture', selectedFurniture: newFurnitureCode }));
      setNewFurnitureType('');
      setNewFurnitureCode('');
    }
  };

  const handleSelectType = (type: AnnotationState['selectedType'], furnitureCode?: string) => {
    setState((prev) => ({
      ...prev,
      selectedType: type,
      selectedFurniture: type === 'furniture' ? furnitureCode || null : null,
      mode: type === 'room' ? 'drawBbox' : 'point',
    }));
  };

  const handleDelete = (type: 'furniture' | 'door' | 'window', index: number, subIndex: number) => {
    if (!state.jsonData) return;
    const newData = [...state.jsonData];
    if (type === 'furniture') {
      newData[0].furniture[index].item_positions.splice(subIndex, 1);
      newData[0].furniture[index].item_quantity -= 1;
    } else if (type === 'door') {
      newData[0].doors.positions.splice(subIndex, 1);
      newData[0].doors.quantity -= 1;
    } else if (type === 'window') {
      newData[0].windows.positions.splice(subIndex, 1);
      newData[0].windows.quantity -= 1;
    }
    setState((prev) => ({ ...prev, jsonData: newData }));
  };

  const handleDeleteFurniture = (item_code: string) => {
    if (!state.jsonData) return;
    const furnitureIndex: number = state.jsonData[0].furniture.findIndex(f => f.item_code === item_code);

  
    const confirmDelete = window.confirm(`Are you sure you want to delete the furniture "${item_code}"?`);
    if (!confirmDelete) return;
  
    const newData = [...state.jsonData];
    newData[0].furniture.splice(furnitureIndex, 1);
    setFurnitureList((prev) => prev.filter((code) => code !== item_code));
    setState((prev) => ({
      ...prev,
      jsonData: newData,
      selectedType: prev.selectedFurniture === item_code ? null : prev.selectedType,
      selectedFurniture: prev.selectedFurniture === item_code ? null : prev.selectedFurniture,
    }));
  };

  const handleEditFurnitureType = (index: number, newType: string, newCode: string) => {
    if (!state.jsonData) return;
    const newData = [...state.jsonData];
  
    // Check for duplicate furniture code
    if (furnitureList.includes(newCode) && newCode !== newData[0].furniture[index].item_code) {
      alert('This furniture code already exists!');
      return;
    }

    const oldCode = newData[0].furniture[index].item_code;
    newData[0].furniture[index].item_type = newType;
    newData[0].furniture[index].item_code = newCode;
  
    // Update furnitureList
    const updatedList = furnitureList.map((t) => (t === oldCode ? newCode : t));
    setFurnitureList(updatedList);
  
    setState((prev) => ({
      ...prev,
      jsonData: newData,
      selectedFurniture: prev.selectedFurniture === oldCode ? newCode : prev.selectedFurniture,
    }));
  };
  
  

  const handleAddDoor = () => {
    if (!state.jsonData) return;
    const newData = [...state.jsonData];
    newData[0].doors.positions.push([0, 0]);
    newData[0].doors.quantity += 1;
    setState((prev) => ({ ...prev, jsonData: newData, selectedType: 'door' }));
  };

  const handleAddWindow = () => {
    if (!state.jsonData) return;
    const newData = [...state.jsonData];
    newData[0].windows.positions.push([0, 0]);
    newData[0].windows.quantity += 1;
    setState((prev) => ({ ...prev, jsonData: newData, selectedType: 'window' }));
  };

  const handleDeleteRoom = () => {
    if (!state.jsonData) return;
    const newData = [...state.jsonData];
    newData[0].dimensions = null;
    setState((prev) => ({ ...prev, jsonData: newData }));
  };

  const handleUpdateAnnotations = (jsonData: Room[]) => {
    setState((prev) => ({
      ...prev,
      jsonData,
      mode: prev.mode === 'drawBbox' ? 'none' : prev.mode,
      selectedType: prev.mode === 'drawBbox' ? null : prev.selectedType,
    }));
  };

  const handleZoom = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState((prev) => ({ ...prev, scale: parseFloat(e.target.value) }));
  };

  const uploadRooms = async () => {
    console.log(state.jsonData);
    try {
      const response = await fetch("http://localhost:8000/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(state.jsonData)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Upload failed");
      }

      const result = await response.json();
      alert("Inserted IDs: " + result.inserted_ids.join(", "));
    } catch (error) {
      alert("Error: " + String(error));
    }
  };

  const exportJSON = () => {
    if (state.jsonData && state.image && state.image.length > 0) {
      const fileName = state.jsonData[0]?.room_name || 'image';
  
      // Create timestamp string in the format yyyyMMdd_HHmmss
      const now = new Date();
      const timestamp = `${now.getFullYear()}${(now.getMonth() + 1)
        .toString()
        .padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now
        .getHours()
        .toString()
        .padStart(2, '0')}h${now.getMinutes().toString().padStart(2, '0')}m${now
        .getSeconds()
        .toString()
        .padStart(2, '0')}s`;
  
      const filenameWithTimestamp = `${fileName}_${timestamp}.json`;
  
      saveJson(
        state.jsonData,
        state.image[currentImageIndex].src.split('/').pop() || 'image.jpg',
        state.image[currentImageIndex].width,
        state.image[currentImageIndex].height,
        filenameWithTimestamp
      );
    } else {
      alert('No data or image to export.');
    }
  };
  

  const handleNextImage = () => {
    setCurrentImageIndex((prevIndex) => (prevIndex + 1) % (state.image?.length || 1));
  };

  const handlePreviousImage = () => {
    setCurrentImageIndex((prevIndex) => (prevIndex - 1 + (state.image?.length || 1)) % (state.image?.length || 1));
  };

  const handleReset = () => {
    imageURL.forEach((url) => URL.revokeObjectURL(url));
    setImageURL([]);
    setState({
      jsonData: null,
      image: null,
      scale: 1.0,
      mode: 'none',
      selectedType: null,
      selectedFurniture: null,
    });
    setCurrentImageIndex(0);
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach((input) => {
      (input as HTMLInputElement).value = '';
    });
  };

  const handleRoomNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!state.jsonData) return;
    const newData = [...state.jsonData];
    newData[0].room_name = e.target.value;
    setState((prev) => ({ ...prev, jsonData: newData }));
  };

  

  return (
    <div className="app">
      <h1 className="text-2xl font-bold mb-4">Image Room Annotation Tool</h1>
      <div className="main" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <div className="sidebar" style={{ overflowY: 'auto', flex: '0 0 360px', maxHeight: '750px', borderRight: '1px solid #ccc' }}>
          <div className="sidebar-content">
          <div className="mb-4">
          <div className="mb-2">
            <label htmlFor="upload-image" className="block font-semibold mb-1">📷 Select images (multiple selection allowed)</label>
            <input
              id="upload-image"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              multiple
              className="border border-black p-1 w-full"
            />
          </div>
          <div>
            <label htmlFor="upload-json" className="block font-semibold mb-1">🧾 Upload annotation JSON</label>
            <input
              id="upload-json"
              type="file"
              accept=".json"
              onChange={handleJsonUpload}
              className="border border-black p-1 w-full"
            />
          </div>
        </div>

            
            <div className="mb-4 flex items-center justify-between">
              <button
                className="px-2 py-1 bg-green-600 text-white rounded border border-black"
                onClick={exportJSON}
              >
                Export JSON
              </button>
              <button
                className="px-2 py-1 bg-green-600 text-white rounded border border-black"
                onClick={uploadRooms}
              >
                Save JSON
              </button>
              <button
                onClick={handleReset}
                className="px-2 py-1 bg-red-500 text-white rounded border border-black"
                >
                Reset
              </button>
            </div>
            <hr className="border-black my-2" />
            <div className="mb-4">
              <h2 className="font-bold text-xl">Room Name</h2>
              <input
                type="text"
                value={state.jsonData ? state.jsonData[0].room_name : ''}
                onChange={handleRoomNameChange}
                className="border p-1 w-full"
              />
            </div>
            <hr className="border-black my-2" />
            <Sidebar
            jsonData={state.jsonData}
            furnitureList={furnitureList}
            selectedType={state.selectedType}
            selectedFurniture={state.selectedFurniture}
            onSelectType={handleSelectType}
            onDelete={handleDelete}
            onDeleteFurniture={handleDeleteFurniture}
            onDeleteRoom={handleDeleteRoom}
            onEditFurnitureType={handleEditFurnitureType}
            onChangeShape={(shape) => {
              if (!state.jsonData) return;
              const newData = [...state.jsonData];
              newData[0].shape = shape;
              setState((prev) => ({ ...prev, jsonData: newData }));
            }}
            newFurnitureType={newFurnitureType}
            setNewFurnitureType={setNewFurnitureType}
            newFurnitureCode={newFurnitureCode}
            setNewFurnitureCode={setNewFurnitureCode}
            onAddFurnitureType={handleAddFurnitureType}
            
          />

          </div>
        </div>
        <div className="canvas-container" style={{ flex: '1', overflow: 'hidden' }}>
          <div className="image-slider-controls">
            <button onClick={handlePreviousImage} className="slider-button border border-black">&lt;</button>
            <button onClick={handleNextImage} className="slider-button border border-black">&gt;</button>
          </div>
          <div className="mb-4">
            <label className="mr-2">Zoom in/out ratio:</label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={state.scale}
              onChange={handleZoom}
              className="w-48"
            />
          </div>
          {state.image && state.image.length > 0 && (
            <Canvas
              image={state.image[currentImageIndex]}
              jsonData={state.jsonData}
              scale={state.scale}
              mode={state.mode}
              selectedType={state.selectedType}
              selectedFurniture={state.selectedFurniture}
              onUpdateAnnotations={handleUpdateAnnotations}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default App;