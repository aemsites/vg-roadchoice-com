import { createElement, getJsonFromUrl } from '../../scripts/common.js';
import { readBlockConfig } from '../../scripts/lib-franklin.js';

const blockName = 'catalogs-table';

const tableInfo = [
  {
    sectionTitle: 'catalogs',
    criteria: [
      { type: 'catalog' },
      { language: 'en' },
    ],
    position: 1,
  },
  {
    sectionTitle: 'product-data-sheets',
    criteria: [
      { type: 'product-data-sheet' },
    ],
    position: 2,
  },
  {
    sectionTitle: 'spanish-catalogs',
    criteria: [
      { type: 'catalog' },
      { language: 'es' },
    ],
    position: 3,
  },
  {
    sectionTitle: 'french-catalogs',
    criteria: [
      { type: 'catalog' },
      { language: 'fr' },
    ],
    position: 4,
  },
];

const sortOn = (arr, prop) => {
  arr.sort((a, b) => {
    if (a[prop] < b[prop]) {
      return -1;
    } if (a[prop] > b[prop]) {
      return 1;
    }
    return 0;
  });
};

const buildTables = (catalogs) => {
  const catalogsSection = createElement('div', { classes: `${blockName}-section` });
  tableInfo.forEach((el) => {
    const { sectionTitle, criteria, position } = el;

    const catalogsSubsection = createElement('div', {
      classes: [
        `${blockName}-subsection`,
        `${blockName}-subsection-${position}`,
      ],
    });
    const heading = createElement('h2', {
      classes: `${blockName}-heading`,
      props: { id: sectionTitle },
    });
    heading.textContent = sectionTitle.replaceAll('-', ' ');
    const tableSection = createElement('ul', { classes: `${blockName}-list` });

    const selectedCatalogs = catalogs.filter((catalog) => {
      const conditions = [];
      criteria.forEach((cat) => {
        const [key] = Object.keys(cat);
        const [value] = Object.values(cat);

        const condition = catalog[key].toLowerCase() === value.toLowerCase();
        conditions.push(condition);
      });
      const checker = conditions.every((e) => e === true);
      return checker && catalog;
    });
    sortOn(selectedCatalogs, 'title');

    selectedCatalogs.forEach(({ notes, file, title }) => {
      const isPdf = file.slice(-4) === '.pdf';
      const catalog = createElement('li', { classes: `${blockName}-item` });
      const link = createElement('a', {
        classes: 'item-link',
        props: { href: file },
      });
      link.textContent = title;
      if (isPdf) {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      }
      const note = createElement('span', { classes: 'item-note' });
      note.textContent = notes;

      catalog.append(link);
      if (notes.length > 0) link.append(note);
      tableSection.append(catalog);
    });
    catalogsSubsection.append(heading, tableSection);
    catalogsSection.append(catalogsSubsection);
  });
  return catalogsSection;
};

export default async function decorate(block) {
  const blockConfig = readBlockConfig(block);
  const { url } = blockConfig;

  const { data: allCatalogs } = await getJsonFromUrl(url);

  const tables = buildTables(allCatalogs);

  block.textContent = '';
  block.append(tables);
}
