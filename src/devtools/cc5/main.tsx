import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Cc5Viewer } from './Cc5Viewer';

// Standalone page: imports nothing from the game, reads and writes no save data
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Cc5Viewer />
  </StrictMode>,
);
