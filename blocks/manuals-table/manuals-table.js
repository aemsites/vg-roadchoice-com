const blockName = 'manuals-table';

export default function decorate(block) {
  const tableRows = block.querySelectorAll(':scope > div');
  [...tableRows].forEach((row) => {
    const tableColumns = row.querySelectorAll(':scope > div');
    const oneChild = tableColumns.length === 1;
    [...tableColumns].forEach((column) => {
      const link = column.querySelector(':scope > a');
      column.removeAttribute('data-valign');
      column.className = `${blockName}-column`;
      if (oneChild) column.parentElement.classList.add('one-child');
      if (!link) {
        column.previousElementSibling.classList.add('next-empty');
        column.classList.add('empty');
        return;
      }
      column.textContent = '';
      column.appendChild(link);
    });
  });
}
