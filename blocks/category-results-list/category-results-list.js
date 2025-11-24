import { createElement } from '../../scripts/common.js';
import productCard from '../results-list/product-card.js';
import { subcategorySearch } from '../../scripts/graphql-api.js';

const searchType = 'parts';
let queryObject;
let products;
const amount = 12;

const setCountAndAmount = (count) => {
  const countAndAmount = {
    count,
    amount,
    pages: Math.ceil(count / amount),
  };

  console.log(countAndAmount);
  const event = new CustomEvent('CountReady', { detail: countAndAmount });
  document.dispatchEvent(event);
};

const updateProductList = async (wrapper) => {
  queryObject = JSON.parse(sessionStorage.getItem('query-params'));
  const filteredQueryResult = await subcategorySearch(queryObject);

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
};

const renderBlock = async (block) => {
  const resultsWrapper = createElement('div', { classes: 'results-wrapper' });
  const productList = createElement('ul', { classes: 'results-list' });

  await updateProductList(productList);

  resultsWrapper.append(productList);
  block.append(resultsWrapper);
};

export default async function decorate(block) {
  await renderBlock(block);

  document.addEventListener('QueryUpdated', async (e) => {
    queryObject = e.detail;
    await updateProductList(block);
  });
}
