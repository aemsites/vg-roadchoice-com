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

export async function fetchSearchResults({ query, offset, make, model, searchType, category, applyFuzziness }) {
  const { SEARCH_URL_DEV, CROSS_REFERENCE_QUERY_NAME, PART_NUMBER_QUERY_NAME, MAX_PRODUCTS_PER_QUERY } = SEARCH_CONFIG;

  const queryName = searchType === 'cross' ? CROSS_REFERENCE_QUERY_NAME : PART_NUMBER_QUERY_NAME;

  const graphqlQuery = {
    query: `
      query ${queryName}($q: String!, $limit: Int, $offset: Int, ${searchType === 'parts' ? ', $makeFilter: String, $modelFilter: String' : ''}${category ? ', $categoryFilter: String' : ''}) {
        ${queryName}(q: $q, limit: $limit, offset: $offset, ${searchType === 'parts' ? ', makeFilter: $makeFilter, modelFilter: $modelFilter' : ''}${category ? ', categoryFilter: $categoryFilter' : ''}) {
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
  const { SEARCH_URL_DEV, FILTER_FACETS_QUERY_NAME } = SEARCH_CONFIG;

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

export async function fetchCrossReferenceSuggest({ term, category }) {
  const { SEARCH_URL_DEV, CROSS_REFERENCE_SUGGEST_QUERY_NAME, AUTOSUGGEST_SIZE_SUGGESTION } = SEARCH_CONFIG;

  const graphqlQuery = {
    query: `
      query ${CROSS_REFERENCE_SUGGEST_QUERY_NAME}($term: String!, $sizeSuggestions: Int${category ? ', $categoryFilter: String' : ''}) {
        ${CROSS_REFERENCE_SUGGEST_QUERY_NAME}(term: $term, sizeSuggestions: $sizeSuggestions${category ? ', categoryFilter: $categoryFilter' : ''}) {
          terms
        }
      }
    `,
    variables: {
      term,
      sizeSuggestions: parseInt(AUTOSUGGEST_SIZE_SUGGESTION),
      ...(category && { categoryFilter: category }),
    },
  };

  const { data, error } = await fetchGraphQLData(graphqlQuery, SEARCH_URL_DEV);

  if (error) return { facets: [], error };

  return { suggestions: data.data[CROSS_REFERENCE_SUGGEST_QUERY_NAME] };
}

export async function fetchPartReferenceSuggest({ term, make, model, category }) {
  const { SEARCH_URL_DEV, PART_REFERENCE_SUGGEST_QUERY_NAME, AUTOSUGGEST_SIZE_SUGGESTION } = SEARCH_CONFIG;

  const graphqlQuery = {
    query: `
      query ${PART_REFERENCE_SUGGEST_QUERY_NAME}($term: String!, $sizeSuggestions: Int${make ? ', $makeFilter: String' : ''}${model ? ', $modelFilter: String' : ''}${category ? ', $categoryFilter: String' : ''}) {
        ${PART_REFERENCE_SUGGEST_QUERY_NAME}(term: $term, sizeSuggestions: $sizeSuggestions${make ? ', makeFilter: $makeFilter' : ''}${model ? ', modelFilter: $modelFilter' : ''}${category ? ', categoryFilter: $categoryFilter' : ''}) {
          terms
        }
      }
    `,
    variables: {
      term,
      sizeSuggestions: parseInt(AUTOSUGGEST_SIZE_SUGGESTION),
      ...(make && { makeFilter: make }),
      ...(model && { modelFilter: model }),
      ...(category && { categoryFilter: category }),
    },
  };

  const { data, error } = await fetchGraphQLData(graphqlQuery, SEARCH_URL_DEV);

  if (error) return { facets: [], error };

  return { suggestions: data.data[PART_REFERENCE_SUGGEST_QUERY_NAME] };
}

export async function fetchFuzzySuggest({ q }) {
  const { SEARCH_URL_DEV, RC_PART_FUZZY_SEARCH, AUTOSUGGEST_SIZE_SUGGESTION } = SEARCH_CONFIG;

  const graphqlQuery = {
    query: `
      query ${RC_PART_FUZZY_SEARCH}($q: String!, $limit: Int) {
        ${RC_PART_FUZZY_SEARCH}(q: $q,limit: $limit) {
          suggestions {
            highlighted
            text
          }
        }
      }
    `,
    variables: {
      q,
      limit: parseInt(AUTOSUGGEST_SIZE_SUGGESTION),
    },
  };

  const { data, error } = await fetchGraphQLData(graphqlQuery, SEARCH_URL_DEV);

  if (error) return { facets: [], error };

  return data.data[RC_PART_FUZZY_SEARCH];
}
