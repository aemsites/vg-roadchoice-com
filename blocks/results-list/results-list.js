import { createElement, getTextLabel } from '../../scripts/common.js';
import { getAndApplySearchResults } from '../../blocks/search/search.js';

const blockName = 'results-list';
const loadingLabel = getTextLabel('results_list:loading_label');

export default async function decorate(block) {
  const resultsSection = createElement('div', { classes: `${blockName}__section` });
  const productList = createElement('ul', { classes: `${blockName}__list` });
  const loadingElement = createElement('div', { classes: 'loading' });
  loadingElement.textContent = loadingLabel;
  resultsSection.append(loadingElement);
  resultsSection.append(productList);
  block.textContent = '';
  block.append(resultsSection);
  getAndApplySearchResults({ isFirstSet: true });
}
