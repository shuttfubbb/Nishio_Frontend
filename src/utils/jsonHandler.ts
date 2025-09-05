import { Room } from '../types';

export const saveJson = (jsonData: Room[], imageName: string, imageWidth: number, imageHeight: number, downloadName: string = 'annotations.json') => {
  const dataToExport = jsonData.map((room) => ({
    ...room
  }));

  const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = downloadName;
  a.click();
  URL.revokeObjectURL(url);
};