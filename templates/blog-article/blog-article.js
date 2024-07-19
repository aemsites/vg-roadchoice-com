import { getMetadata } from '../../scripts/lib-franklin.js';
import { createElement } from '../../scripts/common.js';

const title = getMetadata('og:title');
const date = getMetadata('publication-date');

export default async function decorate(doc) {
  const container = doc.querySelector('main');

  const article = container.querySelector('.default-content-wrapper').parentNode;
  article.classList.add('current-article-container');

  const articleTitle = createElement('h1', { classes: ['article-title'] });
  articleTitle.textContent = title;

  const articleDate = createElement('p', { classes: ['article-date'] });
  articleDate.textContent = date;

  article.insertAdjacentElement('afterbegin', articleDate);
  article.insertAdjacentElement('afterbegin', articleTitle);
}
