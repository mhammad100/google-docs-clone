import Icon from './Icon';

const STATES = {
  saved: { icon: 'cloudDone', label: 'Saved' },
  saving: { icon: 'sync', label: 'Saving…' },
  unsaved: { icon: 'sync', label: 'Unsaved changes' },
  error: { icon: 'cloudOff', label: "Couldn't save" },
};

/** Save indicator next to the title, like Docs' cloud icon. Offers a retry after a failed save. */
const SaveStatus = ({ status, onRetry }) => {
  const state = STATES[status] || STATES.saved;
  return (
    <span className={`save-status save-status--${status}`} role="status" aria-live="polite">
      <Icon name={state.icon} size={16} />
      <span className="save-status__label">{state.label}</span>
      {status === 'error' && (
        <button type="button" className="save-status__retry" onClick={onRetry}>
          Retry
        </button>
      )}
    </span>
  );
};

export default SaveStatus;
