import { createContext, useContext, useEffect, useState } from 'react';
import { getLocations } from '../api';
import { message } from 'antd';

const LocationContext = createContext({ locations: [], locationMap: {} });

/**
 * Hook to access the shared locations list and ID → name map.
 */
export function useLocations() {
  return useContext(LocationContext);
}

/**
 * Provider component — fetches locations from the backend on mount.
 */
export function LocationProvider({ children }) {
  const [data, setData] = useState({ locations: [], locationMap: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLocations()
      .then(locations => {
        const locationMap = Object.fromEntries(locations.map(l => [l.id, l.name]));
        setData({ locations, locationMap });
      })
      .catch(() => message.error('Failed to load locations'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null; // Or a global loading spinner

  return (
    <LocationContext.Provider value={data}>
      {children}
    </LocationContext.Provider>
  );
}
