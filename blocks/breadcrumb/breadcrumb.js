import { getMetadata } from '../../scripts/lib-franklin.js';
import { createElement, getTextLabel } from '../../scripts/common.js';

const blockName = 'breadcrumb';
const url = new URL(window.location.href);
const categoryText = 'part-category';
const brandName = getTextLabel('brand_name');

const pageName = getMetadata('og:title');

export default async function decorate(block) {
  const breadcrumbContent = createElement('div', { classes: `${blockName}-content` });
  const breadcrumbList = createElement('ul', { classes: `${blockName}-list` });
  const currentUrl = url.pathname;
  const hasLastSlash = currentUrl[currentUrl.length - 1] === '/';
  const isMainCategory = currentUrl.includes(categoryText) && url.searchParams.get('category') === null;

  const routes = currentUrl.split('/');
  if (routes[0].length === 0) routes[0] = '/';
  if (routes.at(-1).length === 0) routes.pop();

  const amountOfLevels = routes.length - 1;
  const isBlogArticle = document.querySelector('.blog-article');

  let tempUrl = '';
  routes.forEach((path, idx) => {
    if (isMainCategory && path === categoryText) {
      tempUrl += `${path}/`;
      return;
    }
    const lastItem = idx === amountOfLevels;
    const item = createElement('li', { classes: [`${blockName}-item`, `${blockName}-item-${idx}`] });
    const link = createElement('a', { classes: `${blockName}-link` });
    tempUrl += idx === 0 ? path : `${path}${!lastItem || (lastItem && hasLastSlash) ? '/' : ''}`;

    link.href = idx === 0 ? url.origin : `${url.origin}${tempUrl}`;
    if (idx === amountOfLevels && isBlogArticle) {
      link.href = `${url.origin}/blog/${path}`;
      link.innerHTML = `${pageName.toLowerCase()} /`;
      link.classList.add('active-link');
    } else {
      link.innerHTML = idx === 0 ? brandName : path.replaceAll('-', ' ');
    }

    item.appendChild(link);
    breadcrumbList.appendChild(item);
  });
  breadcrumbContent.appendChild(breadcrumbList);

  block.textContent = '';
  block.appendChild(breadcrumbContent);
}
