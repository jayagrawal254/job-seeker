import { Tag } from 'antd';
import { useLocations } from '../context/LocationContext';

/**
 * Renders a list of location tags from a comma-separated ID string.
 * Uses the shared LocationContext for the ID → name mapping.
 *
 * @param {string} csv - Comma-separated location IDs
 * @param {number} [max] - Max tags to show (default: all)
 */
export default function LocationTags({ csv, max }) {
  const { locationMap } = useLocations();
  const ids = String(csv || '').split(',').filter(Boolean);
  const visible = max ? ids.slice(0, max) : ids;

  return (
    <>
      {visible.map(id => (
        <Tag key={id}>{locationMap[id] || id}</Tag>
      ))}
    </>
  );
}
