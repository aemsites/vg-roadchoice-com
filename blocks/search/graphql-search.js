import { getTextLabel, createElement } from '../../scripts/common.js';
import productCard from '../results-list/product-card.js';
import { noResultsTemplate } from '../../templates/search-results/search-results.js';
import { buildFilter } from '../filters/filters.js';
import { amountOfProducts } from './search.js';

const graphQLEndpoint = 'https://search-api-qa-eds.aws.43636.vnonprod.com/search';
const crossReferenceQueryName = 'rccrossreferencesearch';
const partNumberQueryName = 'rcpartsearch';

export async function fetchGraphQL({ query, limit, offset, make, model, searchType, category }) {
  const queryName = searchType === 'cross' ? crossReferenceQueryName : partNumberQueryName;
  const graphqlQuery = {
    query: `
      query ${queryName}($q: String!, $limit: Int, $offset: Int${searchType === 'parts' ? ', $makeFilter: String, $modelFilter: String' : ''}${category ? ', $categoryFilter: String' : ''}) {
        ${queryName}(q: $q, limit: $limit, offset: $offset${searchType === 'parts' ? ', makeFilter: $makeFilter, modelFilter: $modelFilter' : ''}${category ? ', categoryFilter: $categoryFilter' : ''}) {
          count
          items {
            score
            uuid
            metadata {
              base_part_number
              ${searchType === 'cross' ? 'mack_part_number volvo_part_number tenant manufacturer { oem_number name }' : 'model { description make name }'}
              part_name
              path
              part_category
              image_url
            }
          }
          currentPage
          numberOfPages
          facets {
            key
            doc_count
          }
        }
      }
    `,
    variables: {
      q: query,
      limit,
      offset,
      ...(searchType === 'parts' && { makeFilter: make, modelFilter: model }),
      ...(category && { categoryFilter: category }),
    },
  };

  try {
    const response = await fetch(graphQLEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(graphqlQuery),
    });

    if (!response.ok) {
      throw new Error(`Network error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.errors) {
      console.error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
      return { items: [], error: 'An error occurred while searching.' };
    }

    const results = data.data[queryName].items.map((item) => item.metadata);
    const categories = data.data[queryName].facets.map((facet) => [facet.key, facet.doc_count]);

    return { results, categories };
  } catch (error) {
    console.error('Error fetching data:', error.message);
    return { results: [], categories: [] };
  }
}

export const loadGraphQLResults = async ({ isFirstSet }) => {
  const urlParams = new URLSearchParams(window.location.search);
  const resultsSection = document.querySelector('.results-list__section');
  const resultsList = document.querySelector('.results-list__list');
  const query = urlParams.get('q');
  const limit = amountOfProducts;
  const offsetParam = urlParams.get('offset');
  const make = urlParams.get('make') === 'null' ? undefined : urlParams.get('make');
  const model = urlParams.get('model') === 'null' ? undefined : urlParams.get('model');
  const searchType = urlParams.get('st');
  const category = urlParams.get('category');
  const offset = isFirstSet && offsetParam === '0' ? 0 : parseInt(offsetParam) + 1;
  if (!isFirstSet) {
    const newUrl = new URL(window.location);
    newUrl.searchParams.set('offset', offset);
    window.history.pushState({ path: newUrl.href }, '', newUrl.href);
  }
  const filtersWrapper = document.querySelector('.filters-wrapper');
  const loadingLabel = getTextLabel('loading_label');
  let loadingElement = document.querySelector('.loading');
  if (!loadingElement) {
    loadingElement = createElement('div', { classes: 'loading' });
    resultsSection.append(loadingElement);
  }
  loadingElement.textContent = loadingLabel;
  const searchParams = { query, limit, offset: offset * limit, make, model, searchType, category };
  const { results, categories } = await fetchGraphQL(searchParams);
  loadingElement.remove();
  if (results?.length > 0) {
    results.forEach((result) => {
      const liElement = productCard(result, searchType);
      resultsList.appendChild(liElement);
    });
    const buttonTextContent = getTextLabel('pagination_button');
    const resultsCountElement = document.querySelector('.displayed-text');
    const currentAmount = document.querySelectorAll('.product-card').length;
    const displayedTextContent = getTextLabel('pagination_text');
    const newText = displayedTextContent.replace('[$]', currentAmount);
    resultsCountElement.innerText = newText;
    if (offset === 0) {
      const bottomMoreBtn = createElement('button', { classes: ['more-button', 'bottom-more-button'] });
      bottomMoreBtn.textContent = buttonTextContent;
      resultsSection.appendChild(bottomMoreBtn);
      bottomMoreBtn.onclick = () => loadGraphQLResults({ isFirstSet: false });
    }
    if (results.length < amountOfProducts) {
      document.querySelectorAll('.more-button').forEach((moreBtn) => moreBtn.remove());
    }
  }
  if (!results || results.length === 0) {
    const searchResultsSection = document.querySelector('.search-results-section');
    const titleElement = searchResultsSection.querySelector('.title');
    const titleText = getTextLabel('no_results_title').replace('[$]', `${query}`);
    titleElement.innerText = titleText;
    const fragment = document.createRange().createContextualFragment(noResultsTemplate);
    searchResultsSection.classList.add('no-results');
    searchResultsSection.insertBefore(fragment, filtersWrapper);
  }
  const filters = buildFilter(categories);
  if (filters) {
    filtersWrapper.innerHTML = '';
    filtersWrapper.append(filters);
  }
};
