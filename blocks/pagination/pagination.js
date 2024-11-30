import { getTextLabel, createElement } from '../../scripts/common.js';
import { renderSearchResults } from '../search/graphql-search.js';

const blockName = 'pagination';
const partNumberText = getTextLabel('part_number');
const displayedTextContent = getTextLabel('pagination_text');
const buttonTextContent = getTextLabel('pagination_button');
const firstWord = partNumberText.split(' ')[0];

export default async function decorate(block) {
  const paginationSection = createElement('div', { classes: `${blockName}-section` });
  const paginationTitle = createElement('h2', { classes: 'title' });
  paginationTitle.textContent = `${firstWord}s`;
  const showingSection = createElement('div', { classes: 'showing-section' });
  const displayedTextElement = createElement('p', { classes: 'displayed-text' });
  displayedTextElement.textContent = displayedTextContent;
  showingSection.append(displayedTextElement);

  const moreBtnClasses = ['more-button'];
  const moreBtn = createElement('button', { classes: moreBtnClasses });
  moreBtn.textContent = buttonTextContent;
  showingSection.append(moreBtn);
  moreBtn.onclick = () => renderSearchResults({ isFirstSet: false });

  paginationSection.append(paginationTitle, showingSection);

  block.append(paginationSection);
}
