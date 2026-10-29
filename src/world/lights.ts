import { createContext, useContext } from 'react';

/**
 * Whether a home's lights are switched on. Lamps read it to glow or go dark;
 * only brightness changes, never the shader, so the switch costs nothing.
 */
export const LightsOn = createContext(true);
export const useLightsOn = () => useContext(LightsOn);
