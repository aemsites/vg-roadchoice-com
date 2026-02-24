import { getMetadata } from '../../scripts/aem.js';
import { createElement, getTextLabel } from '../../scripts/common.js';

const blockName = 'breadcrumb';
const url = new URL(window.location.href);
const categoryText = 'part-category';
const brandName = getTextLabel('breadcrumb:brand_name');

export default async function decorate(block) {
  const locale = getMetadata('locale');
  const pageName = getMetadata('og:title');
  const breadcrumbContent = createElement('div', { classes: `${blockName}-content` });
  const breadcrumbList = createElement('ul', { classes: `${blockName}-list` });
  const currentUrl = url.pathname;
  const hasLastSlash = currentUrl[currentUrl.length - 1] === '/';
  const isMainCategory = currentUrl.includes(categoryText) && url.searchParams.get('category') === null;
  const isBlogArticle = document.querySelector('.blog-article');
  const routes = currentUrl.split('/');

  if (routes[1]?.toLocaleLowerCase() === locale?.toLocaleLowerCase()) {
    routes.splice(0, 1);
  }

  // In case the currentUrl ends in '/', let's remove the last empty route
  if (routes.at(-1).length === 0) {
    routes.pop();
  }

  let tempUrl = '';
  routes.forEach((path, idx) => {
    if (isMainCategory && path === categoryText) {
      tempUrl += `${path}/`;
      return;
    }
    const isFirstItem = idx === 0;
    const isLastItem = idx === routes.length - 1;
    const item = createElement('li', { classes: [`${blockName}-item`, `${blockName}-item-${idx}`] });
    const link = createElement('a', { classes: `${blockName}-link` });

    tempUrl += path;
    if ((isLastItem && hasLastSlash) || (!isLastItem && tempUrl !== '')) {
      tempUrl += '/';
    }

    if (isLastItem && isBlogArticle) {
      link.href = `${url.origin}/blog/${path}`;
      link.innerHTML = pageName.toLowerCase();
    } else {
      link.href = `${url.origin}/${tempUrl}`;
      link.innerHTML = isFirstItem ? brandName : path.replaceAll('-', ' ');
    }

    if (isLastItem) {
      link.classList.add('active-link');
    }

    item.appendChild(link);
    breadcrumbList.appendChild(item);
  });
  breadcrumbContent.appendChild(breadcrumbList);

  block.textContent = '';
  block.appendChild(breadcrumbContent);
}
