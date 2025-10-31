/**
 * Extract the classes of a block and in case there is a 'limit-X' set, extract it as a number
 * @param {block} block - The block element
 * @returns {number} - A number representing the limit
 */
export const extractLimitFromBlock = (block) => {
  let limit = null;
  const blockClass = [...block.classList].find((className) => className.startsWith('limit-'));
  if (blockClass) {
    const [, value] = blockClass.split('-');
    limit = Number(value);
  }
  return limit;
};

/**
 * Extracts the last folder from a URL.
 *
 * @param {string} url - The URL from which to extract the last folder.
 * @returns {string} The last folder in the URL.
 *
 * @example
 * // Example usage:
 * const url = 'https://example.com/folder1/folder2';
 * const lastFolder = getLastURLFolder(url);
 * console.log(lastFolder); // Output: 'folder2'
 *
 * @description
 * This function splits the URL by '/' and filters out any empty segments.
 * It then returns the last non-empty segment, which represents the last folder in the URL.
 * */
const getLastURLFolder = (url) =>
  url
    .split('/')
    .filter((item) => item.trim() !== '')
    .pop();

/**
 * Filters out the current article from the list of articles.
 *
 * @param {Array<Object>} articles - The list of articles to filter.
 * @returns {Array<Object>} - The filtered list of articles excluding the current article.
 *
 * @example
 * // Example usage:
 * const articles = [
 *  { metadata: { url: 'https://example.com/article1' } },
 *  { metadata: { url: 'https://example.com/article2' } },
 *  { metadata: { url: 'https://example.com/article3' } },
 * ];
 * const filteredArticles = clearCurrentArticle(articles);
 * console.log(filteredArticles);
 * // Output: [{ metadata: { url: 'https://example.com/article1' } }, { metadata: { url: 'https://example.com/article2' } }]
 *
 * @description
 * This function filters out the current article from the list of articles based on the URL or title.
 * It compares the last folder of the current URL with the last folder of each article's URL.
 * If the article has no URL, it falls back to comparing the article title with the current page's h1 title.
 * If either comparison matches, the article is excluded from the filtered list.
 * The function returns a new array containing only the articles that do not match the current article.
 */
export const clearCurrentArticle = (articles) => {
  const currentArticlePath = getLastURLFolder(window.location.href);
  const currentArticleTitle = document.querySelector('h1')?.textContent || '';
  return articles.filter((article) => {
    const articleURL = article?.url || '';
    if (!articleURL) {
      const articleTitle = article?.title || '';
      return articleTitle !== currentArticleTitle ? article : null;
    }
    const lastElementInUrl = articleURL ? getLastURLFolder(articleURL) : null;
    return lastElementInUrl !== currentArticlePath ? article : null;
  });
};
