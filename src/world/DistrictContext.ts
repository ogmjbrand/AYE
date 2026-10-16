import { createContext, useContext } from 'react';
import { DEFAULT_DISTRICT_ID, districtById, type District } from '../lib/geography';

/** The district being shown; the 3D world draws its layout and places. */
export const DistrictContext = createContext<District>(districtById(DEFAULT_DISTRICT_ID));
export const useDistrict = () => useContext(DistrictContext);
export const useLayout = () => useContext(DistrictContext).layout;
