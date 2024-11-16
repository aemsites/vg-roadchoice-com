import { getTextLabel, createElement } from '../../scripts/common.js';
import { amountOfProducts } from '../search/search.js';
import { loadGraphQLResults } from '../search/graphql-search.js';

const blockName = 'pagination';
const amount = JSON.parse(sessionStorage.getItem('amount')) || amountOfProducts;
let products = JSON.parse(sessionStorage.getItem('results')) || [];
let moreBtns = [];
let currentAmount = 0;
let hasMoreItems = false;
let newText = '';
let isDecorated = false;
let imageData = [];
const partNumberText = getTextLabel('part_number');
const displayedTextContent = getTextLabel('pagination_text');
const buttonTextContent = getTextLabel('pagination_button');
const firstWord = partNumberText.split(' ')[0];
const urlCategory = new URLSearchParams(window.location.search).get('cat');

const loadMoreProducts = (props) => {
  const { hidden, amountText } = props;
  const { length } = hidden;
  const isLessThanAmount = length <= amount;
  const nextAmount = isLessThanAmount ? length : amount;
  currentAmount += nextAmount;

  for (let i = 0; i < nextAmount; i += 1) {
    hidden[i].classList.remove('hidden');
  }

  amountText.textContent = displayedTextContent.replace('[$]', currentAmount);

  if (isLessThanAmount) moreBtns.forEach((btn) => btn.classList.add('hidden'));
};

const addShowMoreHandler = (btn, resultsListBlock, amountText) => {
  btn.onclick = () =>
    loadMoreProducts({
      hidden: resultsListBlock.querySelectorAll('.product-card.hidden'),
      amountText,
    });
};

const addButtons = ({ resultsListBlock, moreBtn, bottomMoreBtn }) => {
  resultsListBlock.querySelector('.results-list__section').appendChild(bottomMoreBtn);
  moreBtn.classList.remove('hidden');
  moreBtns = [moreBtn, bottomMoreBtn];
};

const decoratePagination = (block) => {
  const paginationSection = createElement('div', { classes: `${blockName}-section` });
  const paginationTitle = createElement('h2', { classes: 'title' });
  paginationTitle.textContent = `${firstWord}s`;
  const showingSection = createElement('div', { classes: 'showing-section' });
  const displayedTextElement = createElement('p', { classes: 'displayed-text' });
  if (urlCategory) {
    products = products.filter((item) => item['Part Category'].toLowerCase() === urlCategory);
  }
  hasMoreItems = products && products.length > amount;
  currentAmount = hasMoreItems ? amount : [...products].length;
  newText = displayedTextContent.replace('[$]', currentAmount);
  displayedTextElement.textContent = newText;
  showingSection.append(displayedTextElement);

  if (hasMoreItems || !urlCategory) {
    const moreBtnClasses = ['more-button'];
    const moreBtn = createElement('button', { classes: moreBtnClasses });
    moreBtn.textContent = buttonTextContent;
    const bottomMoreBtn = createElement('button', { classes: ['more-button', 'bottom-more-button'] });
    bottomMoreBtn.textContent = buttonTextContent;
    const resultsListBlock = document.querySelector('.results-list.block');
    showingSection.append(moreBtn);
    if (urlCategory) {
      moreBtnClasses.push('hidden');
      addShowMoreHandler(moreBtn, resultsListBlock, displayedTextElement);
      addShowMoreHandler(bottomMoreBtn, resultsListBlock, displayedTextElement);
      if (imageData.length > 0) {
        addButtons({ resultsListBlock, moreBtn, bottomMoreBtn });
      } else {
        document.addEventListener('DataLoaded', () => {
          addButtons({ resultsListBlock, moreBtn, bottomMoreBtn });
        });
      }
    } else {
      moreBtn.onclick = () => loadGraphQLResults({ isFirstSet: false });
    }
  }

  paginationSection.append(paginationTitle, showingSection);

  block.append(paginationSection);
};

export default async function decorate(block) {
  if (!urlCategory) {
    decoratePagination(block);
    return;
  }
  document.addEventListener('DataLoaded', ({ detail }) => {
    products = detail.results;
    imageData = detail.data.imgData;
    if (!isDecorated) {
      isDecorated = true;
      if (products.length > 0) decoratePagination(block);
    }
  });

  if (sessionStorage.getItem('results') && !isDecorated) {
    isDecorated = true;
    if (products.length > 0) decoratePagination(block);
  }
}
