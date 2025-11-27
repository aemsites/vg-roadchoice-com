import { createElement, getOrigin, getDateFromTimestamp, getTextLabel } from '../../scripts/common.js';
import { createOptimizedPicture, loadCSS } from '../../scripts/aem.js';
import createPagination from '../../common/pagination/pagination.js';
import { searchArticles, fetchArticlesAndFacets } from '../../scripts/graphql-api.js';

const blockName = 'blog-results';
const PAGE_SIZE = 10;
let paginationCssOnce;
const pageDataCache = new Map();

const parseBlogArticle = (item) => {
  const isImageLink = (link) => `${link}`.split('?')[0].match(/\.(jpeg|jpg|gif|png|svg|bmp|webp)$/) !== null;

  const getDefaultImage = () => {
    const logoImageURL = '/media/logo/media_10a115d2f3d50f3a22ecd2075307b4f4dcaedb366.jpeg';
    return getOrigin() + logoImageURL;
  };

  return {
    ...item,
    image: item.image ? item.image : getDefaultImage(),
    path: item.url,
    isDefaultImage: !isImageLink(item.image),
  };
};

const renderSearchBar = () => {
  const searchBar = createElement('div', { classes: `${blockName}__search-bar` });
  searchBar.innerHTML = `
    <input type="text" name="search" autocomplete="off" placeholder="${getTextLabel('blog_results:search_placeholder')}"/>
    <button type="submit"><i class="fa fa-search"></i></button>`;
  return searchBar;
};

const renderArticleCard = (entry) => {
  const { path, image, title, description, publishDate } = entry;
  const card = createElement('article', { classes: `${blockName}__article` });
  const picture = createOptimizedPicture(image, title, false, [{ width: '414' }]);
  const formattedDate = getDateFromTimestamp(publishDate);

  card.innerHTML = `
    <a href="${path}">
      ${picture.outerHTML}
    </a>
    <div>
      <span class="date">${formattedDate}</span>
      <h3><a href="${path}">${title}</a></h3>
      <p>${description}</p>
    </div>`;

  return card;
};

const renderBlogList = (block, articles) => {
  const list = createElement('ul', { classes: ['article-list'] });
  articles.forEach((pr) => {
    list.append(renderArticleCard(pr));
  });
  block.append(list);
};

/**
 * Ensures a reusable pagination content area exists on the block.
 *
 * @param {HTMLElement} block
 * @returns {HTMLElement}
 */
const getOrCreateContentArea = (block) => {
  let contentArea = block.querySelector('.pagination-content');
  if (!contentArea) {
    contentArea = createElement('div', { classes: ['pagination-content'] });
    block.appendChild(contentArea);
  }
  return contentArea;
};

/**
 * Loads the pagination CSS exactly once.
 */
const loadPaginationCss = async () => {
  if (!paginationCssOnce) {
    const baseURL = window.location.origin;
    paginationCssOnce = loadCSS(`${baseURL}/common/pagination/pagination.css`);
  }
  await paginationCssOnce;
};

/**
 * Conditionally retrieve article data based on the presence of a search query (q) in the parameters.
 * If a query exists, the query is done to rcsearch, otherwise its done to rcrecommend since it needs all articles.
 *
 * @async
 * @param {object} params - The query parameters, including search terms and filters.
 * @param {string} [params.q] - The search query string. If present, triggers the search function.
 * @returns {Promise<object>} A promise that resolves with the articles and associated data (e.g., facets or metadata).
 *
 * @requires searchArticles - Function for fetching articles with SEARCH query.
 * @requires fetchArticlesAndFacets - Function for fetching articles with RECOMMEND query.
 */
const getArticleData = async (params) => {
  return params.q ? await searchArticles(params) : await fetchArticlesAndFacets(params);
};

/**
 * Returns a per-page loader function bound to the provided base params,
 * with a tiny in-memory cache to avoid refetching visited pages.
 *
 * @param {Object} baseParams
 * @returns {(pageIndex:number) => Promise<Array>}
 */
const makePageLoader =
  (baseParams = {}) =>
  async (pageIndex) => {
    if (pageDataCache.has(pageIndex)) {
      return pageDataCache.get(pageIndex);
    }

    const queryParams = {
      ...baseParams,
      sort: 'PUBLISH_DATE_DESC',
      limit: PAGE_SIZE,
      offset: pageIndex * PAGE_SIZE,
    };

    const { articles } = (await getArticleData(queryParams)) || [];

    const parsed = articles.map((article) => parseBlogArticle(article));
    pageDataCache.set(pageIndex, parsed);
    return parsed;
  };

/**
 * Fetches the first page to compute totals and seed cache.
 *
 * @param {Object} baseParams
 * @returns {{ total:number, totalPages:number }}
 */
const fetchCountAndPrimeCache = async (baseParams = {}) => {
  const queryParams = {
    ...baseParams,
    sort: 'PUBLISH_DATE_DESC',
    limit: PAGE_SIZE,
    offset: 0,
  };

  const first = (await getArticleData(queryParams)) || [];

  const total = Number(first?.count || 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (first?.articles?.length) {
    pageDataCache.set(
      0,
      first.articles.map((i) => parseBlogArticle(i)),
    );
  }

  return { total, totalPages };
};

/**
 * Initializes dynamic pagination with API-backed totalPages and per-page fetching.
 *
 * @param {HTMLElement} block
 * @param {Object} baseParams
 */
const initBlogPagination = async (block, baseParams = {}) => {
  const contentArea = getOrCreateContentArea(block);
  await loadPaginationCss();

  pageDataCache.clear();

  const { total, totalPages } = await fetchCountAndPrimeCache(baseParams);
  const loadPageData = await makePageLoader(baseParams);

  createPagination({
    block,
    contentArea,
    totalPages,
    renderItems: renderBlogList,
    loadPageData,
    initialPage: 0,
  });

  if (total === 0) {
    contentArea.innerHTML = '';
    const noResultsMsg = createElement('p', { classes: `${blockName}__no-results-message` });
    const q = baseParams?.q || '';
    noResultsMsg.textContent = getTextLabel('blog_results:no_results').replace('$0', `"${q}"`);
    contentArea.append(noResultsMsg);
  }
};

const addEventListeners = (block) => {
  const searchInput = block.querySelector(`.${blockName}__search-bar input`);
  const searchButton = block.querySelector(`.${blockName}__search-bar button`);

  const applySearch = async () => {
    const query = searchInput.value?.trim();
    block.querySelector('.pagination-content')?.remove();
    block.querySelector('.pagination-nav')?.remove();
    await initBlogPagination(block, query ? { q: query } : {});
  };

  searchButton.addEventListener('click', applySearch);
  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      applySearch();
    }
  });
};

export default async function decorate(block) {
  block.append(renderSearchBar());
  await initBlogPagination(block);
  addEventListeners(block);
}
