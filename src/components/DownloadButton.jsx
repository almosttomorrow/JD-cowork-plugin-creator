import { useState } from 'react';
import JSZip from 'jszip';

export default function DownloadButton({ result }) {
  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState('');

  const handleDownload = async () => {
    if (!result?.plugins?.length) return;
    setBuilding(true);
    setBuildError('');

    try {
      const zip = new JSZip();
      const isDual = result.plugins.length > 1;

      if (isDual) {
        const parentFolder = `${result.plugins[0].name}-plugins`;
        for (const plugin of result.plugins) {
          for (const file of plugin.files) {
            zip.file(`${parentFolder}/${plugin.name}/${file.path}`, file.content);
          }
        }
      } else {
        const plugin = result.plugins[0];
        for (const file of plugin.files) {
          zip.file(`${plugin.name}/${file.path}`, file.content);
        }
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = isDual
        ? `${result.plugins[0].name}-plugins.zip`
        : `${result.plugins[0].name}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setBuildError('ZIP build failed: ' + err.message);
    } finally {
      setBuilding(false);
    }
  };

  return (
    <>
      <button
        className="download-btn"
        onClick={handleDownload}
        disabled={building}
      >
        {building ? 'Building ZIP…' : '↓ Download ZIP'}
      </button>
      {buildError && <div className="url-error" style={{ marginTop: 8 }}>{buildError}</div>}
    </>
  );
}
