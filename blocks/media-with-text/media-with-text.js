import { unwrapDivs } from '../../scripts/common.js';

const blockName = 'media-with-text';

export default async function decorate(block) {
  const rows = [...block.querySelectorAll(':scope > div')];
  const columns = [...block.querySelectorAll(':scope > div > div')];

  rows.forEach((row) => {
    row.classList.add(`${blockName}__row`);
  });

  columns.forEach((col) => {
    col.classList.add(`${blockName}__column-${col.querySelector('picture') ? 'image' : 'texts'}`);
  });
  unwrapDivs(block);
}
