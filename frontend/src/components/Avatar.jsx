import { initials } from '../utils/format';
import './Avatar.scss';

// Same person always gets the same color (hash of their email or name)
const COLORS = ['#1a73e8', '#188038', '#d93025', '#e37400', '#8430ce', '#007b83', '#c5221f', '#3c4043', '#b06000', '#1967d2'];

const colorFor = (key = '') => {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return COLORS[hash % COLORS.length];
};

const Avatar = ({ name, email, size = 32, className = '' }) => (
  <span
    className={`avatar ${className}`}
    style={{ width: size, height: size, fontSize: Math.round(size * 0.4), background: colorFor(email || name) }}
    aria-hidden="true"
  >
    {initials(name) || '?'}
  </span>
);

export default Avatar;
