export const graphQLConfig = {
  graphQLEndpoint: 'https://search-api-qa-eds.aws.43636.vnonprod.com/search',
  crossReferenceQueryName: 'rccrossreferencesearch',
  partNumberQueryName: 'rcpartsearch',
  filterFacetsQueryName: 'rcfilterfacets',
  maxProductsPerQuery: 12,
};

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

  try {
    const response = await fetch(graphQLEndpoint, {
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
      return { items: [], error: 'An error occurred while searching.' };
    }

    const results = data.data[queryName].items.map((item) => item.metadata);
    const categories = data.data[queryName].facets.map((facet) => [facet.key, facet.doc_count]);

    return { results, categories };
  } catch (error) {
    console.error('Error fetching data:', error.message);
    return { results: [], categories: [] };
  }
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

  try {
    const response = await fetch(graphQLEndpoint, {
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
      return { facets: [], error: 'An error occurred while fetching facets.' };
    }

    return { facets: data.data[filterFacetsQueryName] };
  } catch (error) {
    console.error('Error fetching filter facets:', error.message);
    return { facets: [] };
  }
}
