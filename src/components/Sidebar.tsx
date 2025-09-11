import React, { useState } from 'react';
import { Room, AnnotationState } from '../types';
import '../App.css';
import { EditFurnitureModal } from './EditFurnitureModal';



const colors: { [key: string]: string } = {
  door: 'red',
  window: 'blue',
  room: 'black',
};

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

interface SidebarProps {
  jsonData: Room[] | null;
  furnitureList: string[];
  selectedType: AnnotationState['selectedType'];
  selectedFurniture: string | null;
  onSelectType: (type: AnnotationState['selectedType'], furnitureType?: string) => void;
  onDelete: (type: 'furniture' | 'door' | 'window', index: number, subIndex: number) => void;
  onDeleteFurniture: (item_code: string) => void;
  onDeleteRoom?: () => void;
  onEditFurnitureType?: (index: number, newType: string, newCode: string) => void;
  onChangeShape?: (shape: 'rectangle' | 'circle' | 'other') => void;
  newFurnitureType: string;
  setNewFurnitureType: (val: string) => void;
  newFurnitureCode: string;
  setNewFurnitureCode: (val: string) => void;
  onAddFurnitureType: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  jsonData,
  furnitureList,
  selectedType,
  selectedFurniture,
  onSelectType,
  onDelete,
  onDeleteFurniture,
  onDeleteRoom,
  onEditFurnitureType,
  onChangeShape,
  newFurnitureType,
  setNewFurnitureType,
  newFurnitureCode,
  setNewFurnitureCode,
  onAddFurnitureType,
}) => {
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editType, setEditType] = useState('');
  const [editCode, setEditCode] = useState('');
  // 👉 thêm state fuzzy + useEffect gọi API
  const [fuzzyResults, setFuzzyResults] = useState<{ [key: string]: any[] }>({});

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };
  React.useEffect(() => {
    const fetchFuzzy = async () => {
      if (jsonData && jsonData[0]?.furniture?.length > 0) {
        const codes = jsonData[0].furniture.map(f => f.item_code);
        const res = await fetch("http://localhost:8500/fuzzy_furniture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ codes })
        });
        const data = await res.json();
        setFuzzyResults(data);
      }
    };
    fetchFuzzy();
  }, [jsonData]);

    const fetchFuzzyForItem = async (code: string) => {
    // Nếu đã có trong cache thì thôi
    if (fuzzyResults[code]) return;

    try {
      const res = await fetch("http://localhost:8500/fuzzy_furniture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codes: [code] }), // chỉ gửi 1 mã
      });
      const data = await res.json();
      setFuzzyResults(prev => ({ ...prev, [code]: data[code] || [] }));
    } catch (err) {
      console.error("Fuzzy fetch failed:", err);
    }
  };
  const getColor = (type: string, index: number): string => {
    return colors[type] || stringToColor(type);
  };

  const handleDeleteRoom = () => {
    if (onDeleteRoom) {
      onDeleteRoom();
    }
  };


  return (
    <div className="sidebar-content">
      <div className="mb-4">
        <h2 className="font-bold">Select Object:</h2>
        <button
          className={`px-1 py-0.5 text-sm mr-2 border border-black ${selectedType === 'room' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => onSelectType('room')}
        >
          <span style={{ color: getColor('room', 0), marginRight: '4px' }}>■</span> Room
        </button>
        <button
          className={`px-1 py-0.5 text-sm mr-2 border border-black ${selectedType === 'door' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => onSelectType('door')}
        >
          <span style={{ color: getColor('door', 0), marginRight: '4px' }}>■</span> Door
        </button>
        <button
          className={`px-1 py-0.5 text-sm mr-2 border border-black ${selectedType === 'window' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => onSelectType('window')}
        >
          <span style={{ color: getColor('window', 0), marginRight: '4px' }}>■</span> Window
        </button>
      </div>
      <hr className="border-black my-2" />
      {jsonData && jsonData[0] && (
        <>
          <div className="mb-4">
            <h2 className="font-bold">Room</h2>
            {jsonData[0].dimensions && (
              <div className="ml-2">
                <div className="flex items-center">
                  <span style={{ color: getColor('room', 0), marginRight: '4px' }}>■</span>
                  <span>
                    Bbox: (
                    {Math.round(jsonData[0].dimensions.xmin)},
                    {Math.round(jsonData[0].dimensions.ymin)}) - (
                    {Math.round(jsonData[0].dimensions.xmax)},
                    {Math.round(jsonData[0].dimensions.ymax)})
                  </span>
                  <button
                    className="ml-2 px-1 py-0.5 text-sm bg-red-100 rounded border border-black"
                    onClick={handleDeleteRoom}
                    title="Delete Room"
                  >
                    <span className="text-red-600 font-bold">❌</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          <hr className="border-black my-2" />
          <div className="mt-2 flex items-center">
            <label className="mb-4 font-semibold">Shape:</label>
            <select
              value={jsonData?.[0]?.shape || ''}
              onChange={(e) => onChangeShape?.(e.target.value as 'rectangle' | 'circle' | 'other')}
              className="border border-black px-2 py-1 rounded"
            >
              <option value="rectangle">⏹️ Rectangle</option>
              <option value="circle">⚪ Circle</option>
              <option value="other">🔺 Other</option>
            </select>
          </div>

          <hr className="border-black my-2" />
          <div className="mb-4">
            <div className="flex items-center">
              <h2 className="font-bold">Doors</h2>
              <button
                className="ml-2 px-1 py-0.5 text-sm bg-gray-300 rounded mr-2 border border-black"
                onClick={() => toggleSection('doors')}
              >
                {expandedSections['doors'] ? 'Collapse' : 'Expand'}
              </button>
            </div>
            {expandedSections['doors'] &&
              jsonData[0].doors.map((position, index) => (
                <div key={`door-${index}`} className="ml-2">
                  <div className="flex items-center">
                    <span style={{ color: getColor('door', index), marginRight: '4px' }}>■</span>
                    <span>
                      Door {index + 1}: ({Math.round(position.x)}, {Math.round(position.y)})
                    </span>
                    <button
                      className="ml-2 px-1 py-0.5 text-sm bg-red-100 rounded border border-black"
                      onClick={() => onDelete('door', 0, index)}
                      title="Delete Door"
                    >
                      <span className="text-red-600 font-bold">❌</span>
                    </button>
                  </div>
                </div>
              ))}
          </div>
          <hr className="border-black my-2" />
          <div className="mb-4">
            <div className="flex items-center">
              <h2 className="font-bold">Windows</h2>
              <button
                className="ml-2 px-1 py-0.5 text-sm bg-gray-300 rounded mr-2 border border-black"
                onClick={() => toggleSection('windows')}
              >
                {expandedSections['windows'] ? 'Collapse' : 'Expand'}
              </button>
            </div>
            {expandedSections['windows'] &&
              jsonData[0].windows.map((position, index) => (
                <div key={`window-${index}`} className="ml-2">
                  <div className="flex items-center">
                    <span style={{ color: getColor('window', index), marginRight: '4px' }}>■</span>
                    <span>
                      Window {index + 1}: ({Math.round(position.x)}, {Math.round(position.y)})
                    </span>
                    <button
                      className="ml-2 px-1 py-0.5 text-sm bg-red-100 rounded border border-black"
                      onClick={() => onDelete('window', 0, index)}
                      title="Delete Window"
                    >
                      <span className="text-red-600 font-bold">❌</span>
                    </button>
                  </div>
                </div>
              ))}
          </div>
          <hr className="border-black my-2" />
          <div className="mb-4">
            <h2 className="font-bold">Furniture</h2>
            <div className="mt-2 ml-2">
          <input
            type="text"
            value={newFurnitureCode}
            onChange={(e) => setNewFurnitureCode(e.target.value)}
            placeholder="Furniture Code"
            className="border p-1 mr-2"
          />
          <button
            onClick={onAddFurnitureType}
            className="px-2 py-1 bg-blue-500 text-white rounded border border-black"
          >
            Add Furniture
          </button>
        </div>
            {jsonData[0].furniture.map((furniture, index) => (
              <div key={`furniture-${index}`} className="ml-2">
                <hr className="border-black my-2" />
                <div className="flex items-center">
                  <span style={{ color: getColor(furniture.item_code, index), marginRight: '4px' }}>■</span>
                  <button
                    className={`mr-2 px-1 py-0.5 text-sm border border-black ${
                      selectedType === 'furniture' && selectedFurniture === furniture.item_code
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200'
                    }`}
                    onClick={() => onSelectType('furniture', furniture.item_code)}
                  >
                    {`${furniture.item_code}`}
                  </button>
                  <button
                    className="ml-1 px-1 py-0.5 text-sm bg-yellow-200 rounded border border-black"
                    onClick={() => {
                      setEditIndex(index);
                      setEditCode(furniture.item_code);
                    }}
                    title="Edit Furniture"
                  >
                    ✎
                  </button>

                </div>
              {fuzzyResults[furniture.item_code] && (
                <div className="ml-6 mt-1">
                <select
                  className="border p-1 w-full"
                  value={furniture.item_code || "__placeholder__"}
                  onChange={(e) => {
                    const val = e.target.value;
                    onEditFurnitureType?.(index, "", val);
                  }}
                  onFocus={(e) => {
                    const val = (e.target as HTMLSelectElement).value;
                    onEditFurnitureType?.(index, "", val); // trigger khi focus
                  }}
                >
                  {fuzzyResults[furniture.item_code]?.slice(0, 15).map((m, idx) => (
                    <option key={idx} value={m.code}>
                      {m.code} ({m.W}x{m.D}x{m.H}) [{m.score}%]
                    </option>
                  ))}
                </select>
                </div>
              )}

                <div className="flex items-center mt-2">
                  <button
                    className="px-1 py-0.5 text-sm bg-gray-300 rounded mr-2 border border-black"
                    onClick={() => {toggleSection(`furniture-${index}`)
                  
                    fetchFuzzyForItem(furniture.item_code);
                  }}
                  >
                    {expandedSections[`furniture-${index}`] ? 'Collapse' : 'Expand'}
                  </button>
                  <button
                    className="px-1 py-0.5 text-sm bg-red-100 rounded border border-black"
                    onClick={() => onDeleteFurniture(furniture.item_code)}
                    title="Delete Furniture Type"
                  >
                    <span className="text-red-600 font-bold">❌ Furniture</span>
                  </button>
                </div>

                {expandedSections[`furniture-${index}`] &&
                  furniture.item_positions.map((pos, subIndex) => (
                    <div key={`furniture-point-${index}-${subIndex}`} className="ml-4">
                      <div className="flex items-center">
                        <span style={{ color: getColor(furniture.item_code, index), marginRight: '4px' }}>■</span>
                        <span>
                          Point {subIndex + 1}: ({Math.round(pos.x)}, {Math.round(pos.y)})
                        </span>
                        <button
                          className="ml-2 px-1 py-0.5 text-sm bg-red-100 rounded border border-black"
                          onClick={() => onDelete('furniture', index, subIndex)}
                          title="Delete Position"
                        >
                          <span className="text-red-600 font-bold">❌</span>
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </>
      )}
      {editIndex !== null && (
      <EditFurnitureModal
        type={editType}
        code={editCode}
        onChangeType={setEditType}
        onChangeCode={setEditCode}
        onSave={() => {
          if (onEditFurnitureType) {
            onEditFurnitureType(editIndex, editType, editCode);
            setEditIndex(null);
          }
        }}
        onCancel={() => setEditIndex(null)}
      />
    )}  
    </div>
  );
};
