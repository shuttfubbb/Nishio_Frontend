import React, { ChangeEvent } from 'react';
import { Room } from '../types';

interface FileUploaderProps {
  onImageLoad: (image: HTMLImageElement) => void;
  onJsonLoad: (jsonData: Room[]) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onImageLoad, onJsonLoad }) => {
  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => onImageLoad(img);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleJsonUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const jsonData = JSON.parse(event.target?.result as string);
        onJsonLoad(jsonData);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleImageUpload} />
      <input type="file" accept=".json" onChange={handleJsonUpload} />
    </div>
  );
};