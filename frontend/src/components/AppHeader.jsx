import { Link } from 'react-router-dom';
import UserMenu from './UserMenu';
import './AppHeader.scss';

const AppHeader = () => (
  <header className="app-header">
    <Link to="/" className="app-header__brand">
      <span className="app-header__logo" aria-hidden="true">D</span>
      Docs
    </Link>
    <UserMenu />
  </header>
);

export default AppHeader;
