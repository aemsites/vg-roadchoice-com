// import { getLocale, SEARCH_CONFIG } from '../common.js';
import { searchArticles } from '../graphql-api.js';

export const fetchPressReleases = async ({ q = 'Road', limit, offset } = {}) => {
  const variables = {
    q,
    limit,
    offset,
  };

  try {
    if (!q) {
      throw new Error('query not defined');
    }

    const articles = await searchArticles(variables);
    return articles || null;
  } catch (error) {
    console.error('Error fetching magazine articles:', error);
    return null;
  }
};
