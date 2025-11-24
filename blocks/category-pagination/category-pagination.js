import { createElement, getTextLabel } from '../../scripts/common.js';

// // let products = window.categoryData;
// // let isRendered = false;
// const moreBtns = [];
// let hasMoreItems = false;
// let hasImagesData = false;
// let currentAmount = 0;
const paginationText = getTextLabel('pagination_text');
const buttonText = getTextLabel('pagination_button');
let firstPass = true;

// const loadMoreProducts = (props) => {
//   const { hidden, amountText } = props;
//   const { length } = hidden;
//   const isLessThanAmount = length <= amount;
//   const nextAmount = isLessThanAmount ? length : amount;
//   currentAmount += nextAmount;

//   for (let i = 0; i < nextAmount; i += 1) {
//     hidden[i].classList.remove('hidden');
//   }

//   amountText.textContent = paginationText.replace('[$]', currentAmount);

//   if (isLessThanAmount) moreBtns.forEach((btn) => btn.classList.add('hidden'));
// };

// const addShowMoreHandler = (btn, resultsListBlock, amountText) => {
//   btn.onclick = () =>
//     loadMoreProducts({
//       hidden: resultsListBlock.querySelectorAll('.product-card.hidden'),
//       amountText,
//     });
// };

// const addShowMoreBtns = (props) => {
//   const { resultsListBlock, moreBtn, bottomMoreBtn } = props;
//   resultsListBlock.querySelector('.results-wrapper').appendChild(bottomMoreBtn);
//   moreBtn.classList.remove('hidden');
//   moreBtns.push(moreBtn, bottomMoreBtn);
// };

// const addImagesHandler = ({ resultsListBlock, moreBtn, bottomMoreBtn }) => {
//   document.addEventListener('ImagesLoaded', () => {
//     hasImagesData = true;
//     addShowMoreBtns({ resultsListBlock, moreBtn, bottomMoreBtn });
//   });
// };

const renderBlock = async (block, currentAmount) => {
  const textWrapper = createElement('div', { classes: 'text-wrapper' });
  const text = createElement('p', { classes: 'text' });
  text.textContent = paginationText.replace('[$]', currentAmount);

  // if (hasMoreItems) {
  //   const moreBtn = createElement('button', { classes: ['more-button', 'hidden'] });
  //   moreBtn.textContent = buttonText;
  //   const bottomMoreBtn = createElement('button', { classes: ['more-button', 'bottom-more-button'] });
  //   bottomMoreBtn.textContent = buttonText;
  //   const resultsListBlock = document.querySelector('.category-results-list.block');
  //   addShowMoreHandler(moreBtn, resultsListBlock, text);
  //   addShowMoreHandler(bottomMoreBtn, resultsListBlock, text);
  //   textWrapper.append(moreBtn);
  // }

  if (firstPass) {
    textWrapper.prepend(text);
  } else {
    text.textContent = paginationText.replace('[$]', currentAmount);
  }
  firstPass = false;
  block.append(textWrapper);
};

// // const isRenderedCheck = (block) => {
// //   if (products && amount && !isRendered) {
// //     isRendered = true;
// //     hasMoreItems = products && products.length > amount;
// //     currentAmount = hasMoreItems ? amount : products.length;
// //     newText = paginationText.replace('[$]', currentAmount);
// //     renderBlock(block);
// //   }
// // };

// const getAmount = async () => {
//   let amount = await JSON.parse(sessionStorage.getItem('amountObject'));

//   return amount;
// }

export default async function decorate(block) {
  // const test = await getAmount()
  // console.log(test);

  document.addEventListener('CountReady', (e) => {
    const amountOfProducts = e.detail;

    renderBlock(block, amountOfProducts);
  });

  // console.log(amount);
  // document.addEventListener('FilteredProducts', (e) => {
  //   products = [...e.detail.filteredProducts];
  //   hasMoreItems = products && products.length > amount;
  //   currentAmount = hasMoreItems ? amount : products.length;
  //   newText = paginationText.replace('[$]', currentAmount);
  //   block.textContent = '';
  //   renderBlock(block);
  // });
  // isRenderedCheck(block);
  // if (isRendered) return;
  // document.addEventListener('CategoryDataLoaded', () => {
  //   amount = JSON.parse(sessionStorage.getItem('amount'));
  //   // products = JSON.parse(sessionStorage.getItem('category-data'));
  //   isRenderedCheck(block);
  // });
}
