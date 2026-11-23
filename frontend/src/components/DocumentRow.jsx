import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Avatar from './Avatar';
import Dropdown, { MenuDivider, MenuItem } from './Dropdown';
import Icon from './Icon';
import { ROLE_LABELS, formatEditedAt, timeAgo } from '../utils/format';

/** One row of the documents table: name, owner, last edited and a ⋮ actions menu. */
const DocumentRow = ({ doc, onDelete }) => {
  const me = useSelector((s) => s.auth.user);
  const isOwner = doc.role === 'owner';
  const owner = isOwner ? me : doc.owner;
  const href = `/documents/${doc.id}`;

  const sharing = isOwner
    ? doc.shareCount > 0
      ? { icon: 'people', label: `Shared with ${doc.shareCount} ${doc.shareCount === 1 ? 'person' : 'people'}` }
      : { icon: 'lock', label: 'Private' }
    : { icon: 'people', label: ROLE_LABELS[doc.role] };

  return (
    <li className="doc-row">
      <Link to={href} className="doc-row__link">
        <span className="doc-row__name">
          <span className={`doc-row__icon${isOwner ? '' : ' doc-row__icon--shared'}`}>
            <Icon name="doc" size={22} />
          </span>
          <span className="doc-row__text">
            <span className="doc-row__title">{doc.title}</span>
            <span className="doc-row__sharing">
              <Icon name={sharing.icon} size={14} />
              {sharing.label}
              <span className="doc-row__mobile-meta"> · {timeAgo(doc.updatedAt)}</span>
            </span>
          </span>
        </span>

        <span className="doc-row__owner">
          {owner && <Avatar name={owner.name} email={owner.email} size={24} />}
          <span>{isOwner ? 'me' : owner?.name}</span>
        </span>

        <span className="doc-row__edited" title={new Date(doc.updatedAt).toLocaleString()}>
          {formatEditedAt(doc.updatedAt)}
        </span>
      </Link>

      <Dropdown
        label={<Icon name="more" size={20} />}
        caret={false}
        align="right"
        title="More actions"
        className="doc-row__menu"
        buttonClassName="icon-button"
      >
        {(close) => (
          <>
            <MenuItem icon="openNew" label="Open in new tab" close={close} onSelect={() => window.open(href, '_blank', 'noopener')} />
            {isOwner && (
              <>
                <MenuDivider />
                <MenuItem icon="delete" label="Delete" className="menu-item--danger" close={close} onSelect={() => onDelete(doc)} />
              </>
            )}
          </>
        )}
      </Dropdown>
    </li>
  );
};

export default DocumentRow;
