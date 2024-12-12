import { SEARCH_CONFIG } from '../../scripts/common.js';

async function fetchGraphQLData(graphqlQuery, endpoint) {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(graphqlQuery),
    });

    if (!response.ok) {
      throw new Error(`Network error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.errors) {
      console.error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
      return { error: 'An error occurred during the request.', data: null };
    }

    return { data };
  } catch (error) {
    console.error('Error fetching data:', error.message);
    return { error: 'An unexpected error occurred.', data: null };
  }
}

export async function fetchSearchResults({ query, offset, make, model, searchType, category }) {
  const {
    SEARCH_URL_DEV = false,
    CROSS_REFERENCE_QUERY_NAME = false,
    PART_NUMBER_QUERY_NAME = false,
    MAX_PRODUCTS_PER_QUERY = false,
  } = SEARCH_CONFIG;
  if (!SEARCH_URL_DEV || !CROSS_REFERENCE_QUERY_NAME || !PART_NUMBER_QUERY_NAME || !MAX_PRODUCTS_PER_QUERY) {
    console.error('Missing 1 or more of the attributes in SEARCH CONFIG', SEARCH_CONFIG);
    return { results: [], categories: [], error: 'An unexpected error occurred in SEARCH CONFIG fetching results.' };
  }
  const queryName = searchType === 'cross' ? CROSS_REFERENCE_QUERY_NAME : PART_NUMBER_QUERY_NAME;

  const graphqlQuery = {
    query: `
      query ${queryName}($q: String!, $limit: Int, $offset: Int${searchType === 'parts' ? ', $makeFilter: String, $modelFilter: String' : ''}${category ? ', $categoryFilter: String' : ''}) {
        ${queryName}(q: $q, limit: $limit, offset: $offset${searchType === 'parts' ? ', makeFilter: $makeFilter, modelFilter: $modelFilter' : ''}${category ? ', categoryFilter: $categoryFilter' : ''}) {
          count
          items {
            score
            uuid
            metadata {
              base_part_number
              ${searchType === 'cross' ? 'mack_part_number volvo_part_number tenant manufacturer { oem_number name }' : 'model { description make name }'}
              part_name
              path
              part_category
              image_url
            }
          }
          currentPage
          numberOfPages
          facets {
            key
            doc_count
          }
        }
      }
    `,
    variables: {
      q: query,
      limit: parseInt(MAX_PRODUCTS_PER_QUERY),
      offset,
      ...(searchType === 'parts' && { makeFilter: make, modelFilter: model }),
      ...(category && { categoryFilter: category }),
    },
  };

  const { data, error } = await fetchGraphQLData(graphqlQuery, SEARCH_URL_DEV);

  if (error) return { results: [], categories: [], error };

  const results = data.data[queryName].items.map((item) => item.metadata);
  const categories = data.data[queryName].facets.map((facet) => [facet.key, facet.doc_count]);

  return { results, categories };
}

export async function fetchFilterFacets({ field, filter }) {
  const { SEARCH_URL_DEV = false, FILTER_FACETS_QUERY_NAME = false } = SEARCH_CONFIG;
  if (!SEARCH_URL_DEV || !FILTER_FACETS_QUERY_NAME) {
    console.error('Missing 1 or more attributes in SEARCH CONFIG', SEARCH_CONFIG);
    return { facets: [], error: 'An unexpected error occurred in SEARCH CONFIG fetching filters.' };
  }

  const graphqlQuery = {
    query: `
      query ${FILTER_FACETS_QUERY_NAME}($field: RcFieldEnum!, $filter: String) {
        ${FILTER_FACETS_QUERY_NAME}(field: $field, filter: $filter) {
          facets {
            key
            doc_count
          }
        }
      }
    `,
    variables: {
      field,
      ...(filter && { filter }),
    },
  };

  const { data, error } = await fetchGraphQLData(graphqlQuery, SEARCH_URL_DEV);

  if (error) return { facets: [], error };

  return { facets: data.data[FILTER_FACETS_QUERY_NAME] };
}
