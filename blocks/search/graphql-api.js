export const graphQLConfig = {
  graphQLEndpoint: 'https://search-api-qa-eds.aws.43636.vnonprod.com/search',
  crossReferenceQueryName: 'rccrossreferencesearch',
  partNumberQueryName: 'rcpartsearch',
  filterFacetsQueryName: 'rcfilterfacets',
  maxProductsPerQuery: 12,
};

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
  const { graphQLEndpoint, crossReferenceQueryName, partNumberQueryName, maxProductsPerQuery } = graphQLConfig;
  const queryName = searchType === 'cross' ? crossReferenceQueryName : partNumberQueryName;

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
      limit: maxProductsPerQuery,
      offset,
      ...(searchType === 'parts' && { makeFilter: make, modelFilter: model }),
      ...(category && { categoryFilter: category }),
    },
  };

  const { data, error } = await fetchGraphQLData(graphqlQuery, graphQLEndpoint);

  if (error) return { results: [], categories: [], error };

  const results = data.data[queryName].items.map((item) => item.metadata);
  const categories = data.data[queryName].facets.map((facet) => [facet.key, facet.doc_count]);

  return { results, categories };
}

export async function fetchFilterFacets({ field, filter }) {
  const { graphQLEndpoint, filterFacetsQueryName } = graphQLConfig;

  const graphqlQuery = {
    query: `
      query ${filterFacetsQueryName}($field: RcFieldEnum!, $filter: String) {
        ${filterFacetsQueryName}(field: $field, filter: $filter) {
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

  const { data, error } = await fetchGraphQLData(graphqlQuery, graphQLEndpoint);

  if (error) return { facets: [], error };

  return { facets: data.data[filterFacetsQueryName] };
}
