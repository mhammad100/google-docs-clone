import { Link } from 'react-router-dom';
import Icon from './Icon';
import UserMenu from './UserMenu';
import './AppHeader.scss';

const AppHeader = () => (
  <header className="app-header">
    <Link to="/" className="app-header__brand" aria-label="Docs home">
      <span className="app-header__logo">
        <Icon name="doc" size={30} />
      </span>
      <span className="app-header__name">Docs</span>
    </Link>
    <UserMenu />
  </header>
);

export default AppHeader;
