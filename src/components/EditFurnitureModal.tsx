import React from 'react';

interface EditFurnitureModalProps {
  type: string;
  code: string;
  onChangeType: (val: string) => void;
  onChangeCode: (val: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

const modalStyle: React.CSSProperties = {
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  backgroundColor: 'white',
  padding: '16px',
  border: '2px solid black',
  borderRadius: '8px',
  zIndex: 999,
  boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
  width: '300px',
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.3)',
  zIndex: 998,
};

export const EditFurnitureModal: React.FC<EditFurnitureModalProps> = ({
  type,
  code,
  onChangeType,
  onChangeCode,
  onSave,
  onCancel,
}) => {
  return (
    <>
      <div style={overlayStyle} onClick={onCancel} />
      <div style={modalStyle}>
        <h2 className="font-bold text-lg mb-2">Chỉnh sửa nội thất</h2>
        <div className="mb-2">
          <label className="block text-sm font-medium">Tên nội thất:</label>
          <input
            value={type}
            onChange={(e) => onChangeType(e.target.value)}
            className="w-full border border-black px-2 py-1 text-sm"
          />
        </div>
        <div className="mb-2">
          <label className="block text-sm font-medium">Mã nội thất:</label>
          <input
            value={code}
            onChange={(e) => onChangeCode(e.target.value)}
            className="w-full border border-black px-2 py-1 text-sm"
          />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button className="px-2 py-1 bg-blue-500 text-white border border-black rounded" onClick={onSave}>
            Lưu
          </button>
          <button className="px-2 py-1 bg-gray-300 border border-black rounded" onClick={onCancel}>
            Hủy
          </button>
        </div>
      </div>
    </>
  );
};
