import {
  getTextLabel,
  getJsonFromUrl,
  createElement,
} from '../../scripts/common.js';
import { readBlockConfig } from '../../scripts/lib-franklin.js';

const blockName = 'blog-results';

let selectedCategories = [];
let articlesPerPage = 4;
let firstBuild = true;
const paginationText = getTextLabel('pagination');
const rawText = getTextLabel('blog_pagination_number');
const readMoreText = getTextLabel('read_more');

let totalArticleCount;
let allArticles;
let buildResults;

const divideArray = (mainArray, perChunk) => {
  const dividedArrays = mainArray.reduce((resultArray, item, index) => {
    const chunkIndex = Math.floor(index / perChunk);
    if (!resultArray[chunkIndex]) {
      resultArray[chunkIndex] = [];
    }
    resultArray[chunkIndex].push(item);
    return resultArray;
  }, []);
  return dividedArrays;
};

const reduceArrays = (array) => {
  const initialValue = {};
  const reduced = array.reduce(
    (acc, value) => ({ ...acc, [value]: (acc[value] || 0) + 1 }),
    initialValue,
  );
  return reduced;
};

const filterCats = () => {
  firstBuild = true;
  let newResults;
  if (selectedCategories.length === 0) {
    newResults = buildResults(allArticles, 0);
  } else {
    const getArticlesWithCat = (categories, articles) => {
      const selectedArticles = [];
      categories.forEach((category) => {
        const selectedArticle = articles.filter((article) => article.category === category);
        selectedArticles.push(selectedArticle);
      });
      const groupedArticles = selectedArticles.flat();
      return groupedArticles;
    };
    const newArts = getArticlesWithCat(selectedCategories, allArticles);
    newResults = buildResults(newArts, 0);
  }
  const oldResults = document.querySelector(`.${blockName}-articles`);
  oldResults.insertAdjacentElement('beforebegin', newResults);
  oldResults.remove();
};

const deleteCats = (sidebar) => {
  firstBuild = true;
  selectedCategories = [];
  const allBtns = sidebar.querySelectorAll('.category');
  allBtns.forEach((btn) => delete btn.dataset.active);

  const newResults = buildResults(allArticles, 0);
  const oldResults = document.querySelector(`.${blockName}-articles`);
  oldResults.insertAdjacentElement('beforebegin', newResults);
  oldResults.remove();
};

const selectCats = (e) => {
  const currentBtn = e.target;
  const currentCategory = e.target.id;
  if (selectedCategories.includes(currentCategory)) {
    delete currentBtn.dataset.active;
    const index = selectedCategories.indexOf(currentCategory);
    selectedCategories.splice(index, 1);
  } else {
    currentBtn.dataset.active = true;
    selectedCategories.push(currentCategory);
  }
};

const reduceCategories = (arts) => {
  const categoryList = arts.map((x) => x.category);
  const reducedCategories = reduceArrays(categoryList);
  const orderedCategories = Object.keys(reducedCategories).sort().reduce(
    (obj, key) => {
      obj[key] = reducedCategories[key];
      return obj;
    },
    {},
  );
  const reducedArray = Object.entries(orderedCategories);

  return reducedArray;
};

const formatDate = (date) => {
  const convertedDate = new Date(parseInt(date, 10) * 1000);

  const day = convertedDate.getDate();
  const month = convertedDate.getMonth() + 1;
  const year = convertedDate.getFullYear();

  return `${month}/${day}/${year}`;
};

const handlePaginationStyling = (page, total, value, section) => {
  const previousPage = page + 1;
  const allBtns = section.querySelectorAll('.pagination-button');
  allBtns.forEach((btn) => {
    btn.dataset.active = true;
  });

  const lastBtn = section.querySelector('#btn-last');
  const firstBtn = section.querySelector('#btn-first');
  const nextBtn = section.querySelector('#btn-next');
  const prevBtn = section.querySelector('#btn-prev');

  const clickedBtn = section.querySelector(`#btn-${value}`);
  let activeNumber;

  if (Number.isFinite(Number(value))) clickedBtn.dataset.active = false;

  if (+value === total || value === 'last') {
    activeNumber = section.querySelector(`#btn-${total}`);
    activeNumber.dataset.active = false;
    lastBtn.dataset.active = false;
    nextBtn.dataset.active = false;
  }
  if (+value === 1 || value === 'first') {
    activeNumber = section.querySelector('#btn-1');
    activeNumber.dataset.active = false;
    firstBtn.dataset.active = false;
    prevBtn.dataset.active = false;
  }
  if (value === 'next' && previousPage === total - 1) {
    lastBtn.dataset.active = false;
    nextBtn.dataset.active = false;
  }
  if (value === 'prev' && previousPage === 2) {
    firstBtn.dataset.active = false;
    prevBtn.dataset.active = false;
  }
  if (value === 'next') {
    activeNumber = section.querySelector(`#btn-${previousPage + 1}`);
    activeNumber.dataset.active = false;
  }
  if (value === 'prev') {
    activeNumber = section.querySelector(`#btn-${previousPage - 1}`);
    activeNumber.dataset.active = false;
  }
};

const handlePagination = (e, articles, page, total) => {
  firstBuild = false;
  let nextPage;

  const btnClassList = [...e.target.classList];

  const isNumber = btnClassList.includes('page-number');
  const btnId = e.target.id;
  const btnValue = btnId.slice(4);

  if (isNumber) {
    nextPage = buildResults(articles, btnValue - 1);
  }
  if (btnValue === 'first') {
    nextPage = buildResults(articles, 0);
  }
  if (btnValue === 'last') {
    nextPage = buildResults(articles, total - 1);
  }
  if (btnValue === 'prev') {
    if (page === 0) {
      return null;
    }
    nextPage = buildResults(articles, page - 1);
  }
  if (btnValue === 'next') {
    if (page === total - 1) {
      return null;
    }
    nextPage = buildResults(articles, page + 1);
  }
  const currPage = document.querySelector(`.${blockName}-articles`);
  currPage.insertAdjacentElement('beforebegin', nextPage);
  currPage.remove();

  handlePaginationStyling(page, total, btnValue, nextPage);
  return false;
};

const buildPagination = (articles, totalPages, curentPage) => {
  const paginationLabels = paginationText.split('[/]');
  const [first, prev, next, last] = paginationLabels;

  const bottomPaginationSection = createElement('div', { classes: 'pagination-bottom-section' });

  const firstPageBtn = createElement('a', { classes: ['first-page', 'pagination-button'], props: { id: 'btn-first' } });
  firstPageBtn.textContent = first;
  if (firstBuild) firstPageBtn.dataset.active = false;
  const prevPageBtn = createElement('a', { classes: ['prev-page', 'pagination-button'], props: { id: 'btn-prev' } });
  prevPageBtn.textContent = prev;
  if (firstBuild) prevPageBtn.dataset.active = false;
  const nextPageBtn = createElement('a', { classes: ['next-page', 'pagination-button'], props: { id: 'btn-next' } });
  nextPageBtn.textContent = next;
  if (totalPages === 1) nextPageBtn.dataset.active = false;
  const lastPageBtn = createElement('a', { classes: ['last-page', 'pagination-button'], props: { id: 'btn-last' } });
  lastPageBtn.textContent = last;
  if (totalPages === 1) lastPageBtn.dataset.active = false;

  const paginationList = createElement('ul', { classes: 'pagination-list' });

  for (let i = 0; i < totalPages; i += 1) {
    const pageNumber = i + 1;
    const pageItem = createElement('li', { classes: ['page-item', `page-number-${pageNumber}`] });
    const pageLink = createElement('a', { classes: ['page-number', 'pagination-button'], props: { id: `btn-${pageNumber}` } });
    pageLink.textContent = pageNumber;
    if (i === 0 && firstBuild) pageLink.dataset.active = false;
    pageItem.appendChild(pageLink);
    paginationList.appendChild(pageItem);
  }
  bottomPaginationSection.append(
    firstPageBtn,
    prevPageBtn,
    paginationList,
    nextPageBtn,
    lastPageBtn,
  );

  const allBtns = bottomPaginationSection.querySelectorAll('.pagination-button');
  allBtns.forEach((btn) => btn.addEventListener('click', (e) => handlePagination(e, articles, curentPage, totalPages)));

  return bottomPaginationSection;
};

buildResults = (articles, page) => {
  articles.sort((a, b) => {
    a.date = +(a.date);
    b.date = +(b.date);
    return b.date - a.date;
  });

  const results = createElement('div', { classes: `${blockName}-articles` });

  const topPaginationSection = createElement('div', { classes: 'pagination-top-section' });
  const topPagination = createElement('p', { classes: 'pagination-top' });

  if (firstBuild) totalArticleCount = rawText.replace('[$]', articles.length);
  topPagination.textContent = totalArticleCount;
  topPaginationSection.appendChild(topPagination);

  const articleSection = createElement('ul', { classes: 'articles-section' });

  const groupedArticles = (page === 0 && firstBuild)
    ? divideArray(articles, articlesPerPage)
    : articles;

  const amountOfPages = groupedArticles.length;
  const activePage = groupedArticles[page];

  activePage.forEach((art, idx) => {
    const article = createElement('li', { classes: ['article', `page-${idx}`] });
    const title = createElement('h2', { classes: 'title' });
    const titleLink = createElement('a', { classes: 'title-link', props: { href: art.path } });
    titleLink.textContent = art.title;
    title.appendChild(titleLink);

    const date = createElement('p', { classes: 'date' });
    date.textContent = formatDate(art.date);

    const description = createElement('p', { classes: 'description' });
    description.textContent = art.description;

    const link = createElement('a', { classes: 'link', props: { href: art.path } });
    link.textContent = readMoreText;

    article.append(title, date, description, link);
    articleSection.appendChild(article);
  });
  const bottomPagination = buildPagination(groupedArticles, amountOfPages, page);
  results.append(topPaginationSection, articleSection, bottomPagination);

  return results;
};

const buildSidebar = (articles, titleContent) => {
  const sidebar = createElement('div', { classes: `${blockName}-sidebar` });

  const titleSection = createElement('div', { classes: 'title-section' });
  const title = createElement('h4', { classes: 'title' });
  title.textContent = titleContent;
  const closeButton = createElement('button', {
    classes: ['close-button', 'fa', 'fa-close'],
    props: {
      type: 'button',
      id: 'close-button',
    },
  });
  closeButton.onclick = () => deleteCats(sidebar);
  titleSection.append(title, closeButton);

  const filterSection = createElement('div', { classes: 'filter-section' });
  const filterButton = createElement('button', {
    classes: 'filter-button',
    props: {
      type: 'button',
    },
  });
  filterButton.textContent = 'Filter';
  filterButton.onclick = () => filterCats();
  filterSection.append(filterButton);

  const categoriesSection = createElement('div', { classes: 'categories-section' });
  const amountsAndCategories = reduceCategories(articles);

  amountsAndCategories.forEach((art) => {
    const [cat, amount] = art;
    const category = createElement('a', { classes: 'category', props: { id: `${cat}` } });

    category.onclick = (e) => selectCats(e);
    category.textContent = `${cat} (${amount})`;
    categoriesSection.appendChild(category);
  });
  sidebar.append(titleSection, filterSection, categoriesSection);

  return sidebar;
};

export default async function decorate(block) {
  const blockConfig = readBlockConfig(block);
  const [titleContent, url, amount] = Object.values(blockConfig);
  articlesPerPage = +amount;

  const json = await getJsonFromUrl(url);
  allArticles = json.data;
  allArticles.sort((a, b) => {
    a.date = +(a.date);
    b.date = +(b.date);
    return b.date - a.date;
  });

  const sidebar = buildSidebar(allArticles, titleContent);
  const results = buildResults(allArticles, 0);

  block.textContent = '';
  block.append(sidebar, results);
}
