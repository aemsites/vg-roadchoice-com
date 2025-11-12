import { fetchCategories } from '../../scripts/graphql-api.js';
import { getCategoryObject } from '../common.js';

/**
 * Extract the classes of a block and in case there is a 'limit-X' set, extract it as a number
 * @param {block} block - The block element
 * @returns {number} - A number representing the limit
 */
export const getLimitFromBlock = (block) => {
  let limit = null;
  const blockClass = [...block.classList].find((className) => className.startsWith('limit-'));
  if (blockClass) {
    const [, value] = blockClass.split('-');
    limit = Number(value);
  }
  return limit;
};

/**
 * Extracts the last path segment from a URL.
 *
 * @param {string} url - The URL from which to extract the last segment.
 * @returns {string} The last segment in the URL.
 *
 * @example
 * // Example usage:
 * const url = 'https://example.com/folder1/folder2';
 * const lastPathSegment = getLastURLSegment(url);
 * console.log(lastPathSegment); // Output: 'folder2'
 *
 * @description
 * This function splits the URL by '/' and filters out any empty segments.
 * It then returns the last non-empty segment, which represents the last segment in the URL.
 * */
const getLastURLSegment = (url) =>
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
 * It compares the last segment of the current URL with the last segment of each article's URL.
 * If the article has no URL, it falls back to comparing the article title with the current page's h1 title.
 * If either comparison matches, the article is excluded from the filtered list.
 * The function returns a new array containing only the articles that do not match the current article.
 */
export const clearCurrentArticle = (articles) => {
  const currentArticlePath = getLastURLSegment(window.location.href);
  const currentArticleTitle = document.querySelector('h1')?.textContent || '';
  return articles.filter((article) => {
    const articleURL = article?.url || '';
    if (!articleURL) {
      const articleTitle = article?.title || '';
      return articleTitle !== currentArticleTitle ? article : null;
    }
    const lastElementInUrl = articleURL ? getLastURLSegment(articleURL) : null;
    return lastElementInUrl !== currentArticlePath ? article : null;
  });
};

/**
 * @param {string} subcategory - The  string slug used to identify the subcategory as apears in the API
 * @returns {Promise<Object | null>} A promise that resolves to an object containing the resolved
 * category keys, in the format: { category: string, subcategory: string } or null
 */
export async function getBlogCategory(subcategory) {
  try {
    const categoryList = await fetchCategories();

    if (!categoryList || categoryList.length === 0) return null;

    return getCategoryObject(categoryList, subcategory);
  } catch (error) {
    console.log(error);
    return null;
  }
}
