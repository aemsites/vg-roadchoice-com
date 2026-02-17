import { getTextLabel, createElement } from '../../scripts/common.js';

const subTitleText = getTextLabel('search_results:no_results_subtitle');
const needHelp = getTextLabel('search_results:no_results_need_help');
const contactUsText = getTextLabel('search_results:no_results_contact_us');
export const results = [];
export const allProducts = {};

export const noResultsTemplate = `
  <div class="no-results-section">
    <h5 class="no-results-subtitle">${subTitleText}</h5>
    <div class="no-results-options">
      <h5 class="no-results-help">${needHelp}</h5>
      <p class="no-results-contact">${contactUsText}
      <a class="no-results-contact-link" href="mailto:info@roadchoice.com">
        info@roadchoice.com</a>
      </p>
    </div>
  </div>
`;

export default async function decorate(doc) {
  const main = doc.querySelector('main');
  const section = createElement('div', {
    classes: ['section', 'search-results'],
    props: {
      'data-section-status': 'initialized',
      style: 'display: none;',
    },
  });
  const searchBar = main.querySelector('.search-container.section');
  const filters = main.querySelector('.filters-wrapper');
  const resultsList = main.querySelector('.results-list-wrapper');
  const pagination = main.querySelector('.pagination-wrapper');
  const searchResultsWrapper = createElement('div', { classes: 'search-results-wrapper' });
  const searchResultsSection = createElement('div', { classes: 'search-results-section' });
  const titleSection = createElement('div', { classes: 'title-section' });
  const titleElement = createElement('h1', { classes: 'title' });
  titleSection.appendChild(titleElement);
  searchResultsSection.append(titleSection, filters, pagination, resultsList);
  searchResultsWrapper.appendChild(searchResultsSection);
  section.appendChild(searchResultsWrapper);

  if (searchBar) {
    main.prepend(searchBar);
  }
  main.append(section);

  // These containers are beign left behind and generating unnecessary padding. Since we are appending the other 3
  // blocks (filters, results-list and pagination) at WRAPPER level these should be removed.
  // TODO: refactor this block so that this step is not necessary.
  ['.filters-container', '.results-list-container', '.pagination-container'].forEach((selector) => main.querySelector(selector)?.remove());
}
