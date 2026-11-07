import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../index.css';
import { loadAssetManifest } from '../../lib/assetManifest';
import { VfxLab } from './VfxLab';

// Standalone page: reads and writes no save data
loadAssetManifest().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <VfxLab />
    </StrictMode>,
  );
});
