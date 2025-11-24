import { createElement, getTextLabel } from '../../scripts/common.js';

const paginationText = getTextLabel('pagination_text');
const buttonText = getTextLabel('pagination_button');
let firstPass = true;
let hasMoreItems;
let currentAmount;
let currentPage = 1;

const handleShowMore = (buttons, countAndAmount) => {
  const { count, amount, pages } = countAndAmount;
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      //check button visibility
      currentPage++;
      if (currentPage >= pages) {
        buttons.forEach((btn) => btn.classList.add('hidden'));
      }

      //update pagination text
      const textNode = document.querySelector('.category-pagination .text-wrapper p');
      const visibleProductsNumber = currentAmount + amount >= count ? count : currentAmount + amount;
      currentAmount = currentAmount + amount;

      textNode.textContent = paginationText.replace('[$]', visibleProductsNumber);

      // show cards
      const productCards = document.querySelectorAll('.category-results-list .results-list .product-card.hidden');
      productCards.forEach((card, idx) => {
        if (idx < amount) {
          card.classList.remove('hidden');
        }
      });
    });
  });
};

const renderBlock = async (block, countAndAmount) => {
  const { count, amount } = countAndAmount;

  hasMoreItems = count > amount;
  currentAmount = hasMoreItems ? amount : count;

  if (!firstPass) {
    block.querySelector('.text-wrapper p').remove();
  }
  const textWrapper = createElement('div', { classes: 'text-wrapper' });
  const text = createElement('p', { classes: 'text' });
  text.textContent = paginationText.replace('[$]', currentAmount);

  if (hasMoreItems) {
    const topMoreBtn = createElement('button', { classes: ['more-button'] });
    topMoreBtn.textContent = buttonText;
    const bottomMoreBtn = createElement('button', { classes: ['more-button', 'bottom-more-button'] });
    bottomMoreBtn.textContent = buttonText;
    const resultsListBlock = document.querySelector('.category-results-list.block');
    resultsListBlock.insertAdjacentElement('afterend', bottomMoreBtn);
    textWrapper.append(topMoreBtn);
    const buttons = [topMoreBtn, bottomMoreBtn];

    handleShowMore(buttons, countAndAmount);
  }
  textWrapper.prepend(text);
  block.append(textWrapper);

  firstPass = false;
};

export default async function decorate(block) {
  document.addEventListener('CountReady', (e) => {
    const countAndAmount = e.detail;
    renderBlock(block, countAndAmount);
  });
}
