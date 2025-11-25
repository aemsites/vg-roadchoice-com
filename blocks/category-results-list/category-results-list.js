import { createElement, getLocaleContextedUrl } from '../../scripts/common.js';
import productCard from '../results-list/product-card.js';
import { subcategorySearch } from '../../scripts/graphql-api.js';

const searchType = 'parts';
let queryObject;
let products;
const amount = 12;

function get404PageUrl() {
  return getLocaleContextedUrl('/404.html');
}

// Dispatches an event to be captured by the category-pagination block with:
// amount: products to be shown
// count: total items retrieved
// pages: number of pages to be shown
const setCountAndAmount = (count) => {
  const countAndAmount = {
    count,
    amount,
    pages: Math.ceil(count / amount),
  };

  const event = new CustomEvent('CountReady', { detail: countAndAmount });
  document.dispatchEvent(event);
};

// fetches the items with the updated query and replaces the product list with the new products
const fetchAndUpdateProductList = async (wrapper) => {
  try {
    queryObject = JSON.parse(sessionStorage.getItem('query-params'));
    const filteredQueryResult = await subcategorySearch(queryObject);

    if (filteredQueryResult.items.length === 0) throw new Error('No items retrieved with current URL');

    setCountAndAmount(filteredQueryResult.count);

    products = filteredQueryResult.items.map((item) => item.metadata);

    if (wrapper.hasChildNodes()) {
      wrapper.replaceChildren();
    }

    products.forEach((prod, idx) => {
      const productItem = productCard(prod, searchType);
      if (idx >= amount) productItem.classList.add('hidden');
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
