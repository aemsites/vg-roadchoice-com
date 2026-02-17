import { createElement, getTextLabel } from '../../scripts/common.js';

const paginationText = getTextLabel('category_pagination:pagination_text');
const buttonText = getTextLabel('category_pagination:pagination_button');
let isFirstRenderPass = true;
let hasMoreItems;
let currentDisplayedProds;
let currentPage = 1;

// Set all global values to initial state whenever the query is updated
const setValuesToInitialState = () => {
  isFirstRenderPass = true;
  hasMoreItems;
  currentDisplayedProds;
  currentPage = 1;
};

const showMoreProducts = (productSection, productsToBeShown) => {
  const productCards = productSection.querySelectorAll('.category-results-list .product-card.hidden');
  productCards.forEach((card, idx) => {
    if (idx < productsToBeShown) {
      card.classList.remove('hidden');
    }
  });
};

const updatePaginationText = (paginationSection, visibleProducts) => {
  paginationSection.querySelector('.category-pagination .text-wrapper p').textContent = paginationText.replace('[$]', visibleProducts);
};

const handleShowMore = (buttons, paginationData) => {
  const { productCount, productsPerPage, totalPages } = paginationData;
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const activeSection = btn.closest('.category-filters-container');

      currentPage++;
      if (currentPage >= totalPages) {
        buttons.forEach((btn) => btn.remove());
      }

      const visibleProductsNumber = currentDisplayedProds + productsPerPage >= productCount ? productCount : currentDisplayedProds + productsPerPage;
      currentDisplayedProds = currentDisplayedProds + productsPerPage;

      updatePaginationText(activeSection, visibleProductsNumber);
      showMoreProducts(activeSection, productsPerPage);
    });
  });
};

const renderBlock = async (block, paginationData) => {
  const { productCount, productsPerPage } = paginationData;

  hasMoreItems = productCount > productsPerPage;
  currentDisplayedProds = hasMoreItems ? productsPerPage : productCount;

  if (!isFirstRenderPass) {
    block.querySelector('.text-wrapper').remove();
  }

  const textWrapper = createElement('div', { classes: 'text-wrapper' });
  const text = createElement('p', { classes: 'text' });
  text.textContent = paginationText.replace('[$]', currentDisplayedProds);

  const filtersContainer = document.querySelector('.category-filters-container');
  const hasOldButtons = filtersContainer.querySelectorAll('.more-button');

  if (hasOldButtons) {
    hasOldButtons.forEach((btn) => btn.remove());
  }

  if (hasMoreItems) {
    const topMoreBtn = createElement('button', { classes: ['more-button'] });
    topMoreBtn.textContent = buttonText;
    const bottomMoreBtn = createElement('button', { classes: ['more-button', 'bottom-more-button'] });
    bottomMoreBtn.textContent = buttonText;
    const resultsListBlock = filtersContainer.querySelector('.category-results-list.block');

    resultsListBlock.insertAdjacentElement('afterend', bottomMoreBtn);
    textWrapper.append(topMoreBtn);
    const buttons = [topMoreBtn, bottomMoreBtn];

    handleShowMore(buttons, paginationData);
  }

  textWrapper.prepend(text);
  block.append(textWrapper);

  isFirstRenderPass = false;
};

export default async function decorate(block) {
  // once the event is captured, render the block with the updated amounts of products
  document.addEventListener('CountReady', (e) => {
    const paginationData = e.detail;
    renderBlock(block, paginationData);
    if (isFirstRenderPass) {
      setValuesToInitialState();
    }
  });
}
