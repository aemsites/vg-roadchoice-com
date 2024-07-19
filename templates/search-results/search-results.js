import {
  amountOfProducts,
  fitAmount,
  searchCRPartNumValue,
  searchPartNumValue,
} from '../../blocks/search/search.js';
import productsWorker from '../../scripts/delayed.js';
import { getTextLabel, createElement } from '../../scripts/common.js';

const titleContent = getTextLabel('search_results_title');
const noResultsContent = getTextLabel('no_results_title');
const subTitleText = getTextLabel('no_results_subtitle');
const needHelp = getTextLabel('no_results_need_help');
const contactUsText = getTextLabel('no_results_contact_us');
const amount = amountOfProducts;
const urlParams = new URLSearchParams(window.location.search);
let query = {};
export const results = [];
export const allProducts = {};
let isResultsEmpty = true;
let isDifferentQuery = false;

if (sessionStorage.getItem('query')) {
  query = JSON.parse(sessionStorage.getItem('query'));
  isDifferentQuery = query.value !== urlParams.get('q') || query.searchType !== urlParams.get('st');
  if (isDifferentQuery) {
    sessionStorage.removeItem('results');
    sessionStorage.removeItem('amount');
    sessionStorage.removeItem('query');
    sessionStorage.removeItem('total-results-amount');
  }
}

if (!sessionStorage.getItem('query') || isDifferentQuery) {
  const isCrossRef = urlParams.get('st') === 'cross';
  if (!isCrossRef) {
    query.make = urlParams.get('make');
    query.model = urlParams.get('model');
  }
  query.searchType = urlParams.get('st');
  query.value = urlParams.get('q');
  sessionStorage.setItem('query', JSON.stringify(query));
}

if (sessionStorage.getItem('results')) {
  results.length = 0;
  results.push(...JSON.parse(sessionStorage.getItem('results')));
  isResultsEmpty = false;
}

if (!sessionStorage.getItem('amount')) {
  sessionStorage.setItem('amount', JSON.stringify(amount));
}

const { searchType, value } = query;
const type = (searchType === 'cross' && 'cross-reference') || 'parts';

const isTextNull = (text) => (text === 'null' ? '' : text);

const noResultsTemplate = `
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
  const breadcrumb = main.querySelector('.breadcrumb-container.section');
  const filters = main.querySelector('.filters-wrapper');
  const resultsList = main.querySelector('.results-list-wrapper');
  const pagination = main.querySelector('.pagination-wrapper');
  const searchResultsWrapper = createElement('div', { classes: 'search-results-wrapper' });
  const searchResultsSection = createElement('div', { classes: 'search-results-section' });
  const titleSection = createElement('div', { classes: 'title-section' });
  const title = createElement('h1', { classes: 'title' });
  const titleText = ((searchType === 'cross') && `${titleContent} ${type}: "${value}"`)
    || `${titleContent} ${isTextNull(query.make)} ${isTextNull(query.model)} ${value} ${type}`;

  productsWorker.onmessage = ({ data }) => {
    if (data.crData && data.pnData && data.imgData) {
      if (isResultsEmpty || results.length >= fitAmount) {
        results.length = 0;
        if (searchType === 'cross') {
          results.push(...searchCRPartNumValue(value, data.crData));
        } else {
          const { make, model } = query;
          results.push(...searchPartNumValue(value, make, model, data.pnData));
        }
      }
      // when all messages are send, save the data in the window object again if needed
      if (!Object.prototype.hasOwnProperty.call(window, 'allProducts')) {
        const keys = ['crData', 'pnData', 'imgData'];
        keys.forEach((key) => { allProducts[key] = data[key]; });
        window.allProducts = data;
      }
      const event = new CustomEvent('DataLoaded', { detail: { results, data } });
      document.dispatchEvent(event);
    }
  };

  document.addEventListener('DataLoaded', ({ detail }) => {
    if (detail.results.length === 0) {
      isResultsEmpty = true;
      title.textContent = noResultsContent.replace('[$]', value);
      if (!searchResultsSection.classList.contains('no-results')) {
        const fragment = document.createRange().createContextualFragment(noResultsTemplate);
        searchResultsSection.classList.add('no-results');
        searchResultsSection.insertBefore(fragment, filters);
      }
    }
    const equalResults = results.length === detail.results.length;
    let total = sessionStorage.getItem('total-results-amount');
    let storageResults = sessionStorage.getItem('results');
    if (equalResults && !total && results.length >= fitAmount) {
      sessionStorage.setItem('total-results-amount', results.length);
      total = results.length.toString();
    }
    if (equalResults && !storageResults) {
      const resultsToSave = results.length >= fitAmount ? results.slice(0, fitAmount) : results;
      sessionStorage.setItem('results', JSON.stringify(resultsToSave));
      storageResults = JSON.stringify(resultsToSave);
    }
  });

  const noResults = !isResultsEmpty && results.length === 0;
  const noResultsText = noResultsContent.replace('[$]', value);

  title.textContent = !noResults ? titleText : noResultsText;
  titleSection.appendChild(title);

  searchResultsSection.append(titleSection, filters, pagination, resultsList);
  searchResultsWrapper.appendChild(searchResultsSection);
  section.appendChild(searchResultsWrapper);

  main.textContent = '';
  if (breadcrumb) {
    const breadcrumbBlock = breadcrumb.querySelector('.breadcrumb');

    // update breadcrumb to remove the href to the search item
    const observer = new MutationObserver((mutations) => {
      const { target } = mutations[0];
      if (target.dataset.blockStatus === 'loaded') {
        const breadcrumbList = target.querySelector('.breadcrumb-list');
        const lastElLink = breadcrumbList.lastElementChild.firstElementChild;
        lastElLink.removeAttribute('href');
        observer.disconnect();
      }
    });
    observer.observe(breadcrumbBlock, { attributes: true, attributeFilter: ['data-block-status'] });
    main.prepend(breadcrumb);
  }
  if (searchBar) main.prepend(searchBar);
  if (noResults) {
    const fragment = document.createRange().createContextualFragment(noResultsTemplate);
    searchResultsSection.classList.add('no-results');
    searchResultsSection.insertBefore(fragment, filters);
  }
  main.append(section);
}
