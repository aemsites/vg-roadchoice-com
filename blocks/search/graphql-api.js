import { SEARCH_CONFIG, getPageLanguage } from '../../scripts/common.js';

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

/**
 * Fetch search results from the GraphQL API based on the provided parameters.
 * @param {Object} params - The search parameters.
 * @param {string} params.query - The search query string.
 * @param {number} params.offset - The offset for pagination.
 * @param {string} [params.make] - The make filter (optional).
 * @param {string} [params.model] - The model filter (optional).
 * @param {string} params.searchType - The type of search ('cross' or 'parts').
 * @param {string} [params.category] - The category filter (optional).
 * @param {boolean} [params.applyFuzziness] - Whether to apply fuzziness (optional).
 * @param {string} params.language - The language code for localization.
 * @returns {Object} An object containing the search results and categories.
 */
export async function fetchSearchResults({ query, offset, make, model, searchType, category, applyFuzziness, language = getPageLanguage() }) {
  const { SEARCH_URL_DEV, CROSS_REFERENCE_QUERY_NAME, PART_NUMBER_QUERY_NAME, MAX_PRODUCTS_PER_QUERY, TENANT } = SEARCH_CONFIG;

  const queryName = searchType === 'cross' ? CROSS_REFERENCE_QUERY_NAME : PART_NUMBER_QUERY_NAME;

  const graphqlQuery = {
    query: `
      query ${queryName}($q: String!, $tenant: RcTenantEnum, $language: RcLocaleEnum, $limit: Int, $offset: Int, ${searchType === 'parts' ? ', $makeFilter: String, $modelFilter: String' : ''}${category ? ', $categoryFilter: String' : ''}${applyFuzziness ? ', $applyFuzziness: Boolean' : ''}) {
        ${queryName}(q: $q, tenant: $tenant, language: $language, limit: $limit, offset: $offset, ${searchType === 'parts' ? ', makeFilter: $makeFilter, modelFilter: $modelFilter' : ''}${category ? ', categoryFilter: $categoryFilter' : ''}${applyFuzziness ? ', applyFuzziness: $applyFuzziness' : ''}) {
          count
          items {
            score
            uuid
            metadata {
              tenant
              base_part_number
              ${
                searchType === 'cross'
                  ? `
                mack_part_number
                volvo_part_number
                manufacturer {
                  oem_number
                  name
                }`
                  : `
                model {
                  description
                  make
                  name
                }`
              }
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
      tenant: TENANT,
      language,
      q: query,
      limit: parseInt(MAX_PRODUCTS_PER_QUERY),
      offset,
      ...(searchType === 'parts' && { makeFilter: make, modelFilter: model }),
      ...(category && { categoryFilter: category }),
      ...(applyFuzziness && { applyFuzziness }),
    },
  };

  const { data, error } = await fetchGraphQLData(graphqlQuery, SEARCH_URL_DEV);

  if (error) return { results: [], categories: [], error };

  const results = data.data[queryName].items.map((item) => item.metadata);
  const categories = data.data[queryName].facets.map((facet) => [facet.key, facet.doc_count]);

  return { results, categories };
}

/** Fetch filter facets from the GraphQL API based on the provided parameters.
 * @param {Object} params - The filter parameters.
 * @param {string} params.field - The field to fetch facets for (e.g., 'MAKE', 'MODEL').
 * @param {string} [params.filter] - An optional filter string to narrow down the facets.
 * @param {string} params.language - The language code for localization.
 * @returns {Object} An object containing the facets and any error encountered.
 */
export async function fetchFilterFacets({ field, filter, language = getPageLanguage() }) {
  const { SEARCH_URL_DEV, FILTER_FACETS_QUERY_NAME, TENANT } = SEARCH_CONFIG;

  const graphqlQuery = {
    query: `
      query ${FILTER_FACETS_QUERY_NAME}($field: RcFieldEnum!, $tenant: RcTenantEnum, $language: RcLocaleEnum, $filter: String) {
        ${FILTER_FACETS_QUERY_NAME}(field: $field, tenant: $tenant, language: $language, filter: $filter) {
          facets {
            key
            doc_count
          }
        }
      }
    `,
    variables: {
      tenant: TENANT,
      language,
      field,
      ...(filter && { filter }),
    },
  };

  const { data, error } = await fetchGraphQLData(graphqlQuery, SEARCH_URL_DEV);

  if (error) return { facets: [], error };

  return { facets: data.data[FILTER_FACETS_QUERY_NAME] };
}

/** Fetch auto-suggestions for part references or cross-references from the GraphQL API.
 * @param {Object} params - The suggestion parameters.
 * @param {string} params.term - The search term for which to fetch suggestions.
 * @param {string} [params.category] - An optional category filter.
 * @param {string} params.language - The language code for localization.
 * @returns {Object} An object containing the suggestions and any error encountered.
 */
export async function fetchCrossReferenceSuggest({ term, category, language = getPageLanguage() }) {
  const { SEARCH_URL_DEV, CROSS_REFERENCE_SUGGEST_QUERY_NAME, AUTOSUGGEST_SIZE_SUGGESTION, TENANT } = SEARCH_CONFIG;

  const graphqlQuery = {
    query: `
      query ${CROSS_REFERENCE_SUGGEST_QUERY_NAME}($term: String!, $sizeSuggestions: Int${category ? ', $categoryFilter: String' : ''}, $tenant: RcTenantEnum, $language: RcLocaleEnum) {
        ${CROSS_REFERENCE_SUGGEST_QUERY_NAME}(term: $term, sizeSuggestions: $sizeSuggestions${category ? ', categoryFilter: $categoryFilter' : ''}, tenant: $tenant, language: $language) {
          terms
        }
      }
    `,
    variables: {
      tenant: TENANT,
      language,
      term,
      sizeSuggestions: parseInt(AUTOSUGGEST_SIZE_SUGGESTION),
      ...(category && { categoryFilter: category }),
    },
  };

  const { data, error } = await fetchGraphQLData(graphqlQuery, SEARCH_URL_DEV);

  if (error) return { facets: [], error };

  return { suggestions: data.data[CROSS_REFERENCE_SUGGEST_QUERY_NAME] };
}

/** Fetch fuzzy search suggestions from the GraphQL API based on the provided parameters.
 * @param {Object} params - The fuzzy search parameters.
 * @param {string} params.term - The search term for which to fetch suggestions.
 * @param {string} [params.make] - An optional make filter.
 * @param {string} [params.model] - An optional model filter.
 * @param {string} [params.category] - An optional category filter.
 * @param {string} params.language - The language code for localization.
 * @returns {Object} An object containing the fuzzy search suggestions and any error encountered.
 */
export async function fetchPartReferenceSuggest({ term, make, model, category, language = getPageLanguage() }) {
  const { SEARCH_URL_DEV, PART_REFERENCE_SUGGEST_QUERY_NAME, AUTOSUGGEST_SIZE_SUGGESTION, TENANT } = SEARCH_CONFIG;

  const graphqlQuery = {
    query: `
      query ${PART_REFERENCE_SUGGEST_QUERY_NAME}($term: String!, $sizeSuggestions: Int${make ? ', $makeFilter: String' : ''}${model ? ', $modelFilter: String' : ''}${category ? ', $categoryFilter: String' : ''}, $tenant: RcTenantEnum, $language: RcLocaleEnum) {
        ${PART_REFERENCE_SUGGEST_QUERY_NAME}(term: $term, sizeSuggestions: $sizeSuggestions${make ? ', makeFilter: $makeFilter' : ''}${model ? ', modelFilter: $modelFilter' : ''}${category ? ', categoryFilter: $categoryFilter' : ''}, tenant: $tenant, language: $language) {
          terms
        }
      }
    `,
    variables: {
      tenant: TENANT,
      language,
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

/** Fetch fuzzy search suggestions from the GraphQL API based on the provided parameters.
 * @param {Object} params - The fuzzy search parameters.
 * @param {string} params.q - The search term for which to fetch suggestions.
 * @param {string} params.language - The language code for localization.
 * @returns {Object} An object containing the fuzzy search suggestions and any error encountered.
 */
export async function fetchFuzzySuggest({ q, language = getPageLanguage() }) {
  const { SEARCH_URL_DEV, RC_PART_FUZZY_SEARCH, AUTOSUGGEST_SIZE_SUGGESTION, TENANT } = SEARCH_CONFIG;

  const graphqlQuery = {
    query: `
      query ${RC_PART_FUZZY_SEARCH}($q: String!, $limit: Int, $tenant: RcTenantEnum, $language: RcLocaleEnum) {
        ${RC_PART_FUZZY_SEARCH}(q: $q, limit: $limit, tenant: $tenant, language: $language) {
          suggestions {
            highlighted
            text
          }
        }
      }
    `,
    variables: {
      tenant: TENANT,
      language,
      q,
      limit: parseInt(AUTOSUGGEST_SIZE_SUGGESTION),
    },
  };

  const { data, error } = await fetchGraphQLData(graphqlQuery, SEARCH_URL_DEV);

  if (error) return { facets: [], error };

  return data.data[RC_PART_FUZZY_SEARCH];
}

export async function fetchCategories() {
  const { SEARCH_URL_DEV, RC_CATEGORY_FACETS, TENANT } = SEARCH_CONFIG;

  const categoriesQuery = {
    query: `
      query ${RC_CATEGORY_FACETS}($tenant: RcTenantEnum, $language: RcLocaleEnum) {
        ${RC_CATEGORY_FACETS}(tenant: $tenant, language: $language) {
          facets {
            doc_count
            key
            subcategories {
              doc_count
              key
            }
          }
        }
      }
    `,
    variables: {
      tenant: TENANT,
      language: getPageLanguage() || 'EN',
    },
  };

  const { data, error } = await fetchGraphQLData(categoriesQuery, SEARCH_URL_DEV);

  if (error) return { facets: [], error };

  return data.data[RC_CATEGORY_FACETS].facets;
}

export async function fetchArticlesAndFacets({ sort = 'PUBLISH_DATE_DESC', limit = 100, category = null, offset = 0 }) {
  const { SEARCH_URL_DEV, RC_BLOG_RECOMMEND, TENANT } = SEARCH_CONFIG;

  const graphqlQuery = {
    query: `
      query ${RC_BLOG_RECOMMEND}($language: RcLocaleEnum!, $category: String, $sort: RcBlogsSortOptionsEnum, $facets: [RcBlogsFieldEnum], $tag: String, $tenant: RcTenantEnum!, $offset: Int, $limit: Int) {
        ${RC_BLOG_RECOMMEND}(language: $language, category: $category, sort: $sort, facets: $facets, tag: $tag, tenant: $tenant, offset: $offset, limit: $limit) {
          count
          items {
            uuid
            metadata {
              title
              description
              url
              lastModified
              language
              category
              tags
              publishDate
              image
            }
            score
          }
          facets {
            field
            items {
              count
              value
            }
          }
          currentPage
          numberOfPages
        }
      }
    `,
    variables: {
      tenant: TENANT,
      limit,
      offset,
      sort,
      language: getPageLanguage() || 'EN',
      category,
    },
  };

  const { data, error } = await fetchGraphQLData(graphqlQuery, SEARCH_URL_DEV);

  if (error) return { results: [], error };

  const { items, facets } = data.data[RC_BLOG_RECOMMEND];

  const articles = items.map((item) => item.metadata);

  return { articles, facets };
}

export async function subcategorySearch({ category = '', subcategory = '', facetFields = [], dynamicFilters = [], limit = 100, offset = 0 }) {
  const { SEARCH_URL_DEV, RC_SUBCATEGORIES_SEARCH, TENANT } = SEARCH_CONFIG;

  const graphqlQuery = {
    query: `
      query ${RC_SUBCATEGORIES_SEARCH}($categoryFilter: String!, $subcategoryFilter: String!, $facetFields: [String], $dynamicFilters: [RcDynamicFilter], $sortOptions: RcSortOptionsEnum, $limit: Int, $offset: Int, $tenant: RcTenantEnum, $language: RcLocaleEnum) {
        ${RC_SUBCATEGORIES_SEARCH}(categoryFilter: $categoryFilter, subcategoryFilter: $subcategoryFilter, facetFields: $facetFields, dynamicFilters: $dynamicFilters, sortOptions: $sortOptions, limit: $limit, offset: $offset, tenant: $tenant, language: $language) {
          count
          currentPage
          numberOfPages
          items {
            uuid
            metadata {
              base_part_number
              mack_part_number
              volvo_part_number
              part_name
              tenant
              path
              part_category
              description
              image_url
              manufacturer {
                oem_number
                name
              }
              model {
                make
                name
                description
              }
            }
            score
          }
          facets {
            field_name
            facets {
              doc_count
              key
            }
          }
        }
      }
    `,
    variables: {
      tenant: TENANT,
      language: getPageLanguage() || 'EN',
      categoryFilter: category,
      subcategoryFilter: subcategory,
      facetFields,
      dynamicFilters,
      limit,
      offset,
    },
  };

  const { data, error } = await fetchGraphQLData(graphqlQuery, SEARCH_URL_DEV);

  if (error) return { items: [], facets: [], error };

  const result = {
    items: data.data[RC_SUBCATEGORIES_SEARCH].items,
    facets: data.data[RC_SUBCATEGORIES_SEARCH].facets,
  };

  return result;
}
