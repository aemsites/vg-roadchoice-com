import { getTextLabel, createElement } from '../../scripts/common.js';
import { getAndApplySearchResults } from '../search/search.js';

const blockName = 'pagination';
const buttonTextContent = getTextLabel('pagination_button');
const partWord = getTextLabel('part');

export default async function decorate(block) {
  const paginationSection = createElement('div', { classes: `${blockName}-section` });
  const paginationTitle = createElement('h2', { classes: 'title' });
  paginationTitle.textContent = `${partWord}s`;
  const showingSection = createElement('div', { classes: 'showing-section' });
  const topResultsElement = createElement('p', { classes: 'top-results-text' });
  showingSection.append(topResultsElement);

  const moreBtnClasses = ['more-button'];
  const moreBtn = createElement('button', { classes: moreBtnClasses });
  moreBtn.textContent = buttonTextContent;
  showingSection.append(moreBtn);
  moreBtn.onclick = () => getAndApplySearchResults({ isFirstSet: false });

  paginationSection.append(paginationTitle, showingSection);

  block.append(paginationSection);
}
