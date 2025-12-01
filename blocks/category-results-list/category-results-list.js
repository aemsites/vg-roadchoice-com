import { createElement, getLocaleContextedUrl, isLocalhost } from '../../scripts/common.js';
import productCard from '../results-list/product-card.js';
import { subcategorySearch } from '../../scripts/graphql-api.js';
import { triggerCustomEventWithPayload } from '../../scripts/services/part-category.service.js';

const searchType = 'parts';
let queryObject;
let products;
const productsPerPage = 12;

function get404PageUrl() {
  if (isLocalhost()) {
    return getLocaleContextedUrl('/404.html');
  }
}

// Dispatches an event to be captured by the category-pagination block with:
// productsPerPage: products to be shown per page
// productCount: total amount of products retrieved
// totalPages: total number of pages
const setPaginationData = (productCount) => {
  const paginationData = {
    productCount,
    productsPerPage,
    totalPages: Math.ceil(productCount / productsPerPage),
  };

  triggerCustomEventWithPayload('CountReady', paginationData);
};

// fetches the items with the updated query and replaces the product list with the new products
const fetchAndUpdateProductList = async (wrapper) => {
  try {
    queryObject = JSON.parse(sessionStorage.getItem('query-params'));
    const filteredQueryResult = await subcategorySearch(queryObject);

    if (filteredQueryResult.items.length === 0) throw new Error('No items retrieved with current URL');

    setPaginationData(filteredQueryResult.count);

    products = filteredQueryResult.items.map((item) => item.metadata);

    if (wrapper.hasChildNodes()) {
      wrapper.replaceChildren();
    }

    products.forEach((prod, idx) => {
      const productItem = productCard(prod, searchType);
      if (idx >= productsPerPage) productItem.classList.add('hidden');
      wrapper.appendChild(productItem);
    });

    return wrapper;
  } catch (err) {
    console.log('%cError fetching items', 'color:red;background-color:aliceblue', err);
    window.location.href = get404PageUrl();
  }
};

const renderBlock = async (block) => {
  const resultsWrapper = createElement('div', { classes: 'results-wrapper' });
  const productList = createElement('ul', { classes: 'category-results-list' });

  await fetchAndUpdateProductList(productList);

  resultsWrapper.append(productList);
  block.append(resultsWrapper);
};

export default async function decorate(block) {
  await renderBlock(block);

  // when the global query object gets updated, the products list gets re-rendered
  document.addEventListener('QueryUpdated', async (e) => {
    queryObject = e.detail;
    await fetchAndUpdateProductList(block);
  });
}
