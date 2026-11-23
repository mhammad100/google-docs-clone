import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/authSlice';
import { showToast } from '../store/toastSlice';
import Avatar from './Avatar';
import Dropdown, { MenuDivider, MenuItem } from './Dropdown';
import ChangePasswordDialog from './ChangePasswordDialog';
import './UserMenu.scss';

/** Avatar button that opens the account menu (change password, log out). */
const UserMenu = () => {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);
  const [passwordOpen, setPasswordOpen] = useState(false);

  if (!user) return null;

  const handleLogout = () => {
    dispatch(logout());
    dispatch(showToast({ type: 'info', message: 'You have been logged out' }));
  };

  return (
    <>
      <Dropdown
        label={<Avatar name={user.name} email={user.email} size={34} />}
        caret={false}
        align="right"
        title={`Account: ${user.name} (${user.email})`}
        className="user-menu"
        buttonClassName="user-menu__trigger"
      >
        {(close) => (
          <div className="user-menu__panel">
            <div className="user-menu__profile">
              <Avatar name={user.name} email={user.email} size={56} />
              <div className="user-menu__name">Hi, {user.name.split(' ')[0]}!</div>
              <div className="user-menu__email">{user.email}</div>
            </div>
            <MenuDivider />
            <MenuItem icon="key" label="Change password" close={close} onSelect={() => setPasswordOpen(true)} />
            <MenuItem icon="logout" label="Log out" close={close} onSelect={handleLogout} />
          </div>
        )}
      </Dropdown>

      {passwordOpen && <ChangePasswordDialog onClose={() => setPasswordOpen(false)} />}
    </>
  );
};

export default UserMenu;
