const blockName = 'table';

export default function decorate(block) {
  const tableRows = block.querySelectorAll(':scope > div');
  [...tableRows].forEach((row) => {
    const tableColumns = row.querySelectorAll(':scope > div');
    row.className = `${blockName}-row`;
    [...tableColumns].forEach((column) => {
      column.className = `${blockName}-column`;
      column.removeAttribute('data-align');
      const strong = column.querySelector(':scope > strong');
      if (strong) {
        row.classList.add('title');
        column.classList.add('strong');
      }
    });
  });
}
