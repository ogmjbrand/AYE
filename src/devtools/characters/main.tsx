import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../index.css';
import { CharacterLab } from './CharacterLab';

// Standalone page: reads and writes no save data
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CharacterLab />
  </StrictMode>,
);
