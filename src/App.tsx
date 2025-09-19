import React, { useState, useRef } from 'react';
import { useImage } from 'react-konva-utils';
import { Room, AnnotationState } from './types';
import { saveJson } from './utils/jsonHandler';
import { Canvas } from './components/Canvas';
import { Sidebar } from './components/Sidebar';
import { Stage as KonvaStage } from 'konva/lib/Stage';
import './index.css';
import { stat } from 'fs';

const App: React.FC = () => {
  const [state, setState] = useState<AnnotationState>({
    jsonData: null,
    image: null,
    scale: 1.0,
    mode: 'none',
    selectedType: null,
    selectedFurniture: null,
    fileNames: [],
  });
  const [imageURL, setImageURL] = useState<string[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [furnitureList, setFurnitureList] = useState<string[]>([]);
  const [selectedSchoolType, setSelectedSchoolType] = useState<string>('None');
  // Danh sách phòng dạng object { id, name }
  type RoomListItem = { id: string; name: string };
  const [roomList, setRoomList] = useState<RoomListItem[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>('None');
  // Hàm lấy danh sách phòng từ server
  const fetchRoomList = async () => {
    try {
      const response = await fetch("http://localhost:8500/rooms");
      if (!response.ok) throw new Error("Failed to fetch room list");
      const data = await response.json();

      console.log("Fetched room list:", data);

      setRoomList(Array.isArray(data) ? data : []);
    } catch (error) {
      setRoomList([]);
    }
  };

  // Lấy danh sách phòng khi mount
  React.useEffect(() => {
    fetchRoomList();
  }, []);
  const [newFurnitureType, setNewFurnitureType] = useState<string>('');
  const [newFurnitureCode, setNewFurnitureCode] = useState<string>('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const stageRef = useRef<KonvaStage>(null);
  const [image] = useImage(imageURL[currentImageIndex] || '', 'anonymous');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setFileNames([]);
  const files = e.target.files;
    if (files) {
      const newUrls: string[] = [];
      const images: HTMLImageElement[] = [];
      const newFileNames = Array.from(files).map((file) => file.name);
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
            setFileNames((prev) => [...prev, ...newFileNames]);
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

        // Update furniture list
        const jsonFurnitureCodes: string[] = room.furniture.map((f) => f.item_code).filter((t) => typeof t === 'string');
        //const uniqueFurnitureCodes: string[] = Array.from(new Set([...furnitureList, ...jsonFurnitureCodes]));
        const uniqueFurnitureCodes: string[] = Array.from(new Set(jsonFurnitureCodes)); // fix furinitureList not resetting when loading new json
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
    // Validate input
    if (!newFurnitureCode.trim()) {
      alert('Please enter furniture code');
      return;
    }

    // Check for duplicates
    if (furnitureList.includes(newFurnitureCode)) {
      alert('This furniture code already exists!');
      setNewFurnitureCode('');
      return;
    }

    // Create/update data
    setFurnitureList(prev => [...prev, newFurnitureCode]);
    
    const newData: Room[] = state.jsonData 
      ? [...state.jsonData]
      : [{
          room_name: 'New Room',
          room_type: '',
          shape: 'rectangle', 
          dimensions: { xmin: 0, ymin: 0, xmax: 0, ymax: 0 },
          w: 0,
          d: 0,
          doors: [],
          windows: [],
          school_type: '',
          maximum_occupancy: 0,
          furniture: [],
      }];

    // Add new furniture with both code and type
    newData[0].furniture.push({
      item_code: newFurnitureCode,
      item_positions: [],
    });

    // Update state
    setState(prev => ({
      ...prev,
      jsonData: newData,
      selectedType: 'furniture',
      selectedFurniture: newFurnitureCode
    }));

    // Clear inputs
    setNewFurnitureCode('');
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
    } else if (type === 'door') {
      newData[0].doors.splice(subIndex, 1);
    } else if (type === 'window') {
      newData[0].windows.splice(subIndex, 1);
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
      setNewFurnitureCode('');
      return;
    }

    const oldCode = newData[0].furniture[index].item_code;
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
    newData[0].doors.push({x: 0, y: 0});
    setState((prev) => ({ ...prev, jsonData: newData, selectedType: 'door' }));
  };

  const handleAddWindow = () => {
    if (!state.jsonData) return;
    const newData = [...state.jsonData];
    newData[0].windows.push({x: 0, y: 0});
    setState((prev) => ({ ...prev, jsonData: newData, selectedType: 'window' }));
  };

  const onHandleTypeRoomChange = (roomType: string) => {
    if (!state.jsonData) return;
    const newData = [...state.jsonData];
    newData[0].room_type = roomType;
    setState((prev) => ({ ...prev, jsonData: newData }));
    setSelectedRoom(roomType);
  }

const onHandleTypeSchoolChange = (schoolType: string) => {
  setSelectedSchoolType(schoolType);  // set dropdown
};

  const handleDeleteRoom = () => {
    if (!state.jsonData) return;
    const newData = [...state.jsonData];
    newData[0].dimensions = { xmin: 0, ymin: 0, xmax: 0, ymax: 0 };
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

  const extractInfo = async () => {
    if (!fileNames.length) {
      alert("No files selected.");
      return;
    }
    console.log("Sending file names:", fileNames);
    try {
      const response = await fetch("http://localhost:8500/gpt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ files: fileNames })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Request failed");
      }

      const result = await response.json();
      const jsonData = JSON.parse(result);
      jsonData[0].doors = []
      jsonData[0].windows = []
      console.log("Received JSON:", jsonData);

      // Validate and process JSON
      const newData = [...jsonData];
      const room = newData[0];

      const codes = room.furniture?.map((f: { item_code: any; }) => f.item_code) || [];
      const duplicates = codes.filter(
        (code: any, idx: any) => codes.indexOf(code) !== idx
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

      // Update furniture list
      const jsonFurnitureCodes: string[] = room.furniture.map((f: { item_code: any; }) => f.item_code).filter((t: any) => typeof t === 'string');
      //const uniqueFurnitureCodes: string[] = Array.from(new Set([...furnitureList, ...jsonFurnitureCodes]));
      const uniqueFurnitureCodes: string[] = Array.from(new Set(jsonFurnitureCodes));
      setFurnitureList(uniqueFurnitureCodes);

      setState((prev) => ({ ...prev, jsonData: newData }));
    } catch (error) {
      alert("Error: " + String(error));
    }
  };



  const uploadRooms = async () => {
    try {
      console.log("Uploading JSON data:", state.jsonData);
      const x1 = state.jsonData?.[0].dimensions?.xmin || 0;
      const x2 = state.jsonData?.[0].dimensions?.xmax || 0;
      const y1 = state.jsonData?.[0].dimensions?.ymin || 0;
      const y2 = state.jsonData?.[0].dimensions?.ymax || 0;
      const alpha = 17.12; // Hệ số chuyển đổi từ pixel sang mm (ví dụ)
      if (selectedSchoolType === "None") {  //validate select school type
        alert("Select a school type before uploading.");
        return;
      }
      if (state.jsonData && state.jsonData[0]) {
        state.jsonData[0].w = Math.round((y2 - y1) * alpha);
        state.jsonData[0].d = Math.round((x2 - x1) * alpha);

        for (let door of state.jsonData[0].doors) {
          door.x = door.x - x1;
          door.x = Math.max(door.x, 0);
          door.x = Math.min(door.x, x2 - x1);
          door.x = Math.floor(door.x * alpha);

          door.y = door.y - y1;
          door.y = Math.max(door.y, 0);
          door.y = Math.min(door.y, y2 - y1);
          door.y = Math.floor(door.y * alpha);
        }
        for (let window of state.jsonData[0].windows) {
          window.x = window.x - x1;
          window.x = Math.max(window.x, 0);
          window.x = Math.min(window.x, x2 - x1);
          window.x = Math.floor(window.x * alpha);

          window.y = window.y - y1;
          window.y = Math.max(window.y, 0);
          window.y = Math.min(window.y, y2 - y1);
          window.y = Math.floor(window.y * alpha);
        }
        for (let furniture of state.jsonData[0].furniture) {
          for (let pos of furniture.item_positions) {
            pos.x = pos.x - x1;
            pos.x = Math.max(pos.x, 0);
            pos.x = Math.min(pos.x, x2 - x1);
            pos.x = Math.floor(pos.x * alpha);

            pos.y = pos.y - y1;
            pos.y = Math.max(pos.y, 0);
            pos.y = Math.min(pos.y, y2 - y1);
            pos.y = Math.floor(pos.y * alpha);
          }
        }
        if (selectedSchoolType !== "None") {
          state.jsonData[0].school_type = selectedSchoolType;
        }
        console.log("Processed JSON data for upload:", state.jsonData);
        const response = await fetch("http://localhost:8500/roomdata", {
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
        handleReset();
      }
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
      fileNames: [],
    });
    setSelectedRoom('None');
    setSelectedSchoolType("None");
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
          <div className="mb-2">
            <button
                className="px-2 py-1 bg-green-600 text-white rounded border border-black"
                onClick={extractInfo}
              >
                Extract Image's information
              </button>
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
                Save DATA
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
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold whitespace-nowrap">Room Name Detect</label>
                <input
                  type="text"
                  value={state.jsonData ? state.jsonData[0].room_name : ''}
                  readOnly
                  className="border p-1 bg-gray-100 cursor-not-allowed flex-1"
                  tabIndex={-1}
                />
              </div>
              <div className="mt-2">
                <label className="block font-semibold mb-1">Select Room</label>
                <select
                  className="border p-1 w-full"
                  value={selectedRoom}
                  onChange={e => onHandleTypeRoomChange(e.target.value)}
                >
                  <option value="None">None</option>
                  {roomList.map((room, idx) => (
                    <option key={room.id + '-' + idx} value={room.name}>{room.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ height: '10px' }}></div>
              {/* School Type section */}
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-4">
                <label className="text-xs font-semibold whitespace-nowrap">School Type Detect </label>
                <input
                  type="text"
                  value={state.jsonData ? state.jsonData[0].school_type : ''}
                  readOnly
                  className="border p-1 bg-gray-100 cursor-not-allowed flex-1"
                  tabIndex={-1}
                />
              </div>
            </div>
                <div className="mt-2">
                <label className="block font-semibold mb-1">Select School Type </label>
                <select
                  className="border p-1 w-full"
                  value={selectedSchoolType}
                  onChange={e => onHandleTypeSchoolChange(e.target.value)}
                >
                  <option value="None">None</option>
                  <option value="nursery">nursery</option>
                  <option value="elementary">elementary</option>
                  <option value="middle">middle</option>
                  <option value="high">high</option>
                  <option value="special">special</option>
                </select>
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