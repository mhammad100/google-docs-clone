// Word / character counts for the status bar, computed from Editor.js data.

const stripHtml = (html = '') => {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el.textContent || '';
};

const listText = (items = []) =>
  items.flatMap((item) => [typeof item === 'string' ? item : item.content, ...listText(item.items)]);

const blockText = (block) => {
  if (block.type === 'list') return listText(block.data?.items).map(stripHtml).join(' ');
  return stripHtml(block.data?.text);
};

export const documentStats = (content) => {
  const text = (content?.blocks || []).map(blockText).join(' ').trim();
  return {
    words: text ? text.split(/\s+/).length : 0,
    characters: text.replace(/\s+/g, ' ').length,
  };
};
