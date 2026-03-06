import { useState } from 'react';
import JSZip from 'jszip';

export default function DownloadButton({ result }) {
  const [building, setBuilding] = useState(false);

  const handleDownload = async () => {
    if (!result?.plugins?.length) return;
    setBuilding(true);

    try {
      const zip = new JSZip();
      const multiPlugin = result.plugins.length > 1;

      if (multiPlugin) {
        // Dual plugin: create parent folder
        const firstName = result.plugins[0].name;
        const parentFolder = `${firstName}-plugins`;
        for (const plugin of result.plugins) {
          for (const file of plugin.files) {
            zip.file(`${parentFolder}/${plugin.name}/${file.path}`, file.content);
          }
        }
      } else {
        // Single plugin
        const plugin = result.plugins[0];
        for (const file of plugin.files) {
          zip.file(`${plugin.name}/${file.path}`, file.content);
        }
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = multiPlugin
        ? `${result.plugins[0].name}-plugins.zip`
        : `${result.plugins[0].name}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBuilding(false);
    }
  };

  return (
    <button
      className="download-btn"
      onClick={handleDownload}
      disabled={building}
    >
      {building ? 'Building ZIP…' : 'Download ZIP'}
    </button>
  );
}
