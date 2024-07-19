import productsWorker from '../../scripts/delayed.js';
import { createElement, getTextLabel } from '../../scripts/common.js';
import productCard from '../results-list/product-card.js';

let amount = JSON.parse(sessionStorage.getItem('amount'));
let products = window.categoryData;
let isRendered = false;
let hasImagesData = false;
let imgData;
const searchType = 'parts';
const loadingLabel = getTextLabel('loading_label');

productsWorker.onmessage = ({ data }) => {
  if (products && data.imgData && !hasImagesData) {
    hasImagesData = true;
    imgData = data.imgData;
    const event = new CustomEvent('ImagesLoaded', { detail: data.imgData });
    document.dispatchEvent(event);
  }
  // allProducts properties needs to be set again
  if (data.crData && data.pnData && data.imgData) {
    window.allProducts = data;
  }
};

const isTruckLibrary = (text) => text.includes('trucklibrary.com');

const getImagesData = ({ productList, loadingElement, detail }) => {
  loadingElement.remove();
  products.forEach((prod, idx) => {
    prod.hasImage = false;
    const filterLoop = detail.filter((e) => e['Part Number'] === prod['Base Part Number']
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

const addImagesHandler = ({ productList, loadingElement }) => {
  document.addEventListener('ImagesLoaded', ({ detail }) => {
    getImagesData({ productList, loadingElement, detail });
  });
};

const renderBlock = async (block) => {
  const resultsWrapper = createElement('div', { classes: 'results-wrapper' });
  const productList = createElement('ul', { classes: 'results-list' });
  const loadingElement = createElement('div', { classes: 'loading' });
  loadingElement.textContent = loadingLabel;

  resultsWrapper.append(productList, loadingElement);
  block.append(resultsWrapper);

  if (!hasImagesData) addImagesHandler({ productList, loadingElement });
  else getImagesData({ productList, loadingElement, detail: imgData });
};

const isRenderedCheck = (block) => {
  if (products && amount && !isRendered) {
    isRendered = true;
    renderBlock(block);
  }
};

export default async function decorate(block) {
  document.addEventListener('FilteredProducts', (e) => {
    products = [...e.detail.filteredProducts];
    const bottomBtn = block.querySelector('.bottom-more-button');
    block.textContent = '';
    renderBlock(block);
    if (products.length > amount) {
      block.querySelector('.results-wrapper').appendChild(bottomBtn);
    }
  });
  isRenderedCheck(block);
  if (isRendered) return;
  document.addEventListener('CategoryDataLoaded', () => {
    amount = JSON.parse(sessionStorage.getItem('amount'));
    products = JSON.parse(sessionStorage.getItem('category-data'));
    renderBlock(block);
  });
}
