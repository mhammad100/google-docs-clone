import Dropdown, { MenuDivider, MenuItem } from './Dropdown';
import { SHORTCUTS, TEXT_STYLES } from '../editor/shortcuts';

/** File / Edit / Insert / Format menus, Google Docs style. */
const EditorMenuBar = ({ commands, state, canEdit, isOwner, settings, actions }) => {
  const off = !canEdit;

  const menu = (label, items) => (
    <Dropdown label={label} caret={false} buttonClassName="menubar__button">
      {(close) => items(close)}
    </Dropdown>
  );

  return (
    <nav className="menubar" aria-label="Document menu">
      {menu('File', (close) => (
        <>
          <MenuItem icon="add" label="New document" close={close} onSelect={actions.newDocument} />
          <MenuItem icon="upload" label="Import .txt / .md…" close={close} onSelect={actions.importFile} />
          <MenuDivider />
          <MenuItem icon="rename" label="Rename" disabled={off} close={close} onSelect={actions.rename} />
          {isOwner && <MenuItem icon="share" label="Share…" close={close} onSelect={actions.share} />}
          <MenuDivider />
          <MenuItem icon="pageSetup" label="Page setup…" disabled={off} close={close} onSelect={actions.pageSetup} />
          <MenuItem icon="print" label="Print / Save as PDF" shortcut={SHORTCUTS.print} close={close} onSelect={actions.print} />
          {isOwner && (
            <>
              <MenuDivider />
              <MenuItem icon="delete" label="Delete document" close={close} onSelect={actions.deleteDocument} />
            </>
          )}
        </>
      ))}

      {menu('Edit', (close) => (
        <>
          <MenuItem icon="undo" label="Undo" shortcut={SHORTCUTS.undo} disabled={off} close={close} onSelect={commands.undo} />
          <MenuItem icon="redo" label="Redo" shortcut={SHORTCUTS.redo} disabled={off} close={close} onSelect={commands.redo} />
        </>
      ))}

      {menu('Insert', (close) => (
        <>
          <MenuItem icon="divider" label="Horizontal line" disabled={off} close={close} onSelect={commands.divider} />
          <MenuItem icon="quote" label="Quote" disabled={off} close={close} onSelect={commands.quote} />
          <MenuItem icon="checklist" label="Checklist" shortcut={SHORTCUTS.checklist} disabled={off} close={close} onSelect={() => commands.list('checklist')} />
          <MenuDivider />
          <MenuItem icon="headerFooter" label="Header" disabled={off} close={close} onSelect={actions.editHeader} />
          <MenuItem icon="headerFooter" label="Footer" disabled={off} close={close} onSelect={actions.editFooter} />
          <MenuItem
            icon="numbered"
            label={settings.showPageNumbers ? 'Remove page numbers' : 'Page numbers'}
            disabled={off}
            close={close}
            onSelect={actions.togglePageNumbers}
          />
        </>
      ))}

      {menu('Format', (close) => (
        <>
          {TEXT_STYLES.map((style) => (
            <MenuItem
              key={style.value}
              label={style.label}
              shortcut={SHORTCUTS[style.value]}
              active={state.textStyle === style.value}
              disabled={off}
              close={close}
              onSelect={() => commands.textStyle(style.value)}
            />
          ))}
          <MenuDivider />
          <MenuItem icon="bold" label="Bold" shortcut={SHORTCUTS.bold} disabled={off} close={close} onSelect={() => commands.inline('bold')} />
          <MenuItem icon="italic" label="Italic" shortcut={SHORTCUTS.italic} disabled={off} close={close} onSelect={() => commands.inline('italic')} />
          <MenuItem icon="underline" label="Underline" shortcut={SHORTCUTS.underline} disabled={off} close={close} onSelect={() => commands.inline('underline')} />
          <MenuItem icon="strikethrough" label="Strikethrough" shortcut={SHORTCUTS.strikethrough} disabled={off} close={close} onSelect={() => commands.inline('strikethrough')} />
          <MenuItem icon="highlight" label="Highlight" shortcut={SHORTCUTS.highlight} disabled={off} close={close} onSelect={() => commands.wrap('highlight')} />
          <MenuItem icon="code" label="Inline code" shortcut={SHORTCUTS.code} disabled={off} close={close} onSelect={() => commands.wrap('code')} />
          <MenuDivider />
          <MenuItem icon="bulleted" label="Bulleted list" shortcut={SHORTCUTS.unordered} disabled={off} close={close} onSelect={() => commands.list('unordered')} />
          <MenuItem icon="numbered" label="Numbered list" shortcut={SHORTCUTS.ordered} disabled={off} close={close} onSelect={() => commands.list('ordered')} />
          <MenuDivider />
          <MenuItem icon="clear" label="Clear formatting" shortcut={SHORTCUTS.clear} disabled={off} close={close} onSelect={commands.clearFormatting} />
        </>
      ))}
    </nav>
  );
};

export default EditorMenuBar;
