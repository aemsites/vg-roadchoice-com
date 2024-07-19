import { createElement, getTextLabel } from '../../scripts/common.js';
import productCard from './product-card.js';
import { amountOfProducts } from '../search/search.js';
import { results, allProducts } from '../../templates/search-results/search-results.js';

const blockName = 'results-list';
const loadingLabel = getTextLabel('loading_label');
let total = 0;
let amount = amountOfProducts;
let products;
let query;
let category;
let isRendered = false;
const isSearchResult = document.querySelector('.search-results') !== null;

if (isSearchResult) {
  total = +sessionStorage.getItem('total-results-amount') || 0;
  amount = JSON.parse(sessionStorage.getItem('amount')) || amountOfProducts;
  products = JSON.parse(sessionStorage.getItem('results')) || [];
  query = JSON.parse(sessionStorage.getItem('query')) || {};
  category = new URLSearchParams(window.location.search).get('cat');
  if (category) {
    products = products.filter((item) => item['Part Category'].toLowerCase() === category) || [];
  }
}

const searchType = (query.searchType === 'cross' && 'cross') || 'parts';

// eslint-disable-next-line object-curly-newline
const renderResults = ({ loadingElement, productList, isTruckLibrary, detail }) => {
  loadingElement.remove();
  products = category ? products : detail?.results;
  products = total > 0 && category
    ? detail?.results.filter((item) => item['Part Category'].toLowerCase() === category)
    : products;

  if (products.length === 0) return;
  products.forEach((prod, idx) => {
    prod.hasImage = false;
    const filterLoop = detail.data.imgData.filter((e) => e['Part Number'] === prod['Base Part Number']
    && ((isTruckLibrary(e['Image URL']) && e['Image URL'].includes('.0?$'))
    || (!isTruckLibrary(e['Image URL']) && e['Image URL'].includes('-0.jpg'))));
    if (filterLoop.length >= 1) {
      prod.hasImage = true;
      prod.imgUrl = filterLoop[0]['Image URL'];
    }
    const productItem = productCard(prod, searchType);
    if (idx >= amount) productItem.classList.add('hidden');
    productList.appendChild(productItem);
  });
};

export default async function decorate(block) {
  const resultsSection = createElement('div', { classes: `${blockName}__section` });
  const productList = createElement('ul', { classes: `${blockName}__list` });
  const loadingElement = createElement('div', { classes: 'loading' });
  loadingElement.textContent = loadingLabel;
  resultsSection.append(loadingElement);

  const isTruckLibrary = (text) => text.includes('trucklibrary.com');

  const render = (data) => {
    const imgData = data?.imgData || data?.data?.imgData || [];
    const res = data?.results || results || [];
    renderResults({
      loadingElement,
      productList,
      isTruckLibrary,
      detail: { results: res, data: { imgData } },
    });
  };

  if (results.length > 0) {
    let imgData = window?.allProducts?.imgData || allProducts?.imgData || [];
    if (imgData.length > 0) render({ imgData });
    else {
      setTimeout(() => {
        if (allProducts.imgData && !isRendered) {
          imgData = allProducts.imgData;
          productList.innerHTML = '';
          render({ imgData });
        }
      }, 5000);
    }
  } else {
    loadingElement.remove();
  }

  document.addEventListener('DataLoaded', ({ detail }) => {
    render(detail);
    isRendered = true;
  });

  resultsSection.append(productList);

  block.textContent = '';
  block.append(resultsSection);
}
