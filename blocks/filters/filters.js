import { getTextLabel, createElement } from '../../scripts/common.js';

const blockName = 'filters';
const categoriesText = getTextLabel('categories_label');

export const buildFilter = (cats) => {
  const section = createElement('div', { classes: `${blockName}-section` });
  const title = createElement('h3', { classes: 'title' });
  title.textContent = categoriesText;
  const list = createElement('ul', { classes: 'list' });
  const currentUrl = new URL(window.location.href);
  const urlParams = new URLSearchParams(currentUrl.search);

  cats.forEach((cat) => {
    const [category, amount] = cat;
    urlParams.set('category', category.toLowerCase());
    urlParams.set('offset', 0);
    const filterUrl = `${currentUrl.pathname}?${urlParams.toString()}`;
    const item = createElement('li', { classes: 'item' });
    const link = createElement('a', {
      classes: 'categories-link',
      props: { href: filterUrl },
    });
    link.textContent = `${category.toLowerCase()} (${amount})`;
    item.appendChild(link);
    list.appendChild(item);
  });
  section.append(title, list);

  return section;
};

export default async function decorate(block) {
  const filtersWrapper = createElement('div', { classes: `${blockName}-wrapper` });
  block.textContent = '';
  block.append(filtersWrapper);
}
