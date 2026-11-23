import Header from '@editorjs/header';
import List from '@editorjs/list';
import Quote from '@editorjs/quote';
import Delimiter from '@editorjs/delimiter';
import Underline from '@editorjs/underline';
import Marker from '@editorjs/marker';
import InlineCode from '@editorjs/inline-code';

const STRIKE_ICON =
  '<svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M10 19h4v-3h-4v3zM5 4v3h5v3h4V7h5V4H5zM3 14h18v-2H3v2z"/></svg>';

/**
 * Minimal inline tool for strikethrough. Editor.js only keeps inline tags that a registered
 * tool declares in `sanitize`, so this is also what lets <s>/<strike> survive a save.
 */
class Strikethrough {
  static isInline = true;
  static title = 'Strikethrough';
  static sanitize = { s: {}, strike: {} };

  constructor({ api }) {
    this.api = api;
    this.button = null;
  }

  render() {
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.innerHTML = STRIKE_ICON;
    this.button.classList.add(this.api.styles.inlineToolButton);
    return this.button;
  }

  surround() {
    document.execCommand('strikeThrough');
  }

  checkState() {
    const active = document.queryCommandState('strikeThrough');
    this.button?.classList.toggle(this.api.styles.inlineToolButtonActive, active);
    return active;
  }
}

export const INLINE_TOOLBAR = ['bold', 'italic', 'underline', 'strikethrough', 'marker', 'inlineCode', 'link'];

export const EDITOR_TOOLS = {
  header: {
    class: Header,
    inlineToolbar: true,
    config: { levels: [1, 2, 3, 4], defaultLevel: 2, placeholder: 'Heading' },
  },
  list: { class: List, inlineToolbar: true, config: { defaultStyle: 'unordered' } },
  quote: { class: Quote, inlineToolbar: true },
  delimiter: Delimiter,
  underline: Underline,
  strikethrough: { class: Strikethrough, shortcut: 'CMD+SHIFT+X' },
  marker: { class: Marker, shortcut: 'CMD+SHIFT+H' },
  inlineCode: { class: InlineCode, shortcut: 'CMD+SHIFT+C' },
};
