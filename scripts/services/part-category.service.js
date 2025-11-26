import { isLocalhost } from '../common.js';

/* Cases that throw an error if the category is wrong or missing that goes to 404 page:
 * 1. "/part-category/" => 404 if is index path
 * 2. "/part-category/?" => 404 if is index path width query string or wrong query parameter
 * 3. "/part-category/?category" => 404 if is an empty category without "=" sign
 * 4. "/part-category/?category=" => 404 if is an empty category with "=" sign
 * 5. "/part-category/?category=asdf" => 404 if is a wrong category
 */
/**
 * Extracts the category name from the URL path. Debug mode enables work in local with old format URL
 *
 * Returns `null` if the path points to a clean-URL template page (e.g., a category landing page),
 * typically represented by `/part-category/`, `/en-ca/part-category/`, etc.
 *
 * Added a debug mode in order to enable work on local environment.
 * To test for example: http://localhost:3000/part-category/?category=jacks
 *
 * @returns {string|null} The category name from the URL path, or `null` if the path points to a landing page.
 */
export const getCategory = () => {
  if (isLocalhost) {
    const url = new URL(window.location.href);
    const urlParams = new URLSearchParams(url.search);

    return urlParams.get('category') || null;
  } else {
    const parts = window.location.pathname.split('/').filter(Boolean);
    const segment = decodeURIComponent(parts[parts.length - 1] || '').trim();

    if (!segment || ['landing', 'landing.docx'].includes(segment.toLowerCase())) {
      return null;
    }
    return segment;
  }
};

/**
 * Transforms an array of facet objects into a standardized, flattened key-value
 * object map for easier consumption.
 *
 * @param {Array<Object>} facetArray - The array of facet objects received from an API response (e.g., Elasticsearch).
 * @returns {Object<string, Array<Object>>} An accumulator object where keys are the `field_name`s,
 * and values are arrays containing objects with `key` and `doc_count`.
 *
 * @example
 * // Input:
 * // [
 * //   {
 * //     field_name: "Pair",
 * //     facets: [
 * //       { key: "Yes", doc_count: 50 },
 * //       { key: "No", doc_count: 35 }
 * //     ]
 * //   }
 * // ]
 *
 * // Output:
 * // {
 * //   "Pair": [
 * //     { key: "Yes", doc_count: 50 },
 * //     { key: "No", doc_count: 35 }
 * //   ]
 * // }
 */
export const aggregateFilters = (facetArray) => {
  return facetArray.reduce((accumulator, currentItem) => {
    const { field_name, facets } = currentItem;

    const keysArray = facets.map((facet) => ({
      key: facet.key,
      doc_count: facet.doc_count,
    }));

    accumulator[field_name] = keysArray;

    return accumulator;
  }, {});
};

/**
 * Converts a filter object containing dynamic filter parameters into a URL string,
 * correctly encoding filter fields and values.
 *
 * The function constructs the base URL using the current window location pathname
 * and handles the inclusion of the subcategory parameters.
 *
 * @param {object} obj - The object containing filter parameters to convert to URL parameters.
 * @param {Array<Object>} obj.dynamicFilters - An array of dynamic filters to be converted into query parameters.
 * @param {string} obj.dynamicFilters[].fieldName - The name of the filter field (e.g., 'size', 'color').
 * @param {Array<string>} obj.dynamicFilters[].filterValue - An array of selected values for the field.
 * @returns {string} The complete URL string with encoded parameters.
 *
 * @requires getCategory - Assumes a globally available function to retrieve the subcategory string.
 * @global isLocalhost - Assumes a global boolean variable that determines the application's environment.
 *
 * @example
 * // Assuming:
 * // getCategory() returns 'jacks'
 * // window.location.pathname is '/part-category'
 *
 * const filterObj = {
 *   dynamicFilters: [
 *     { fieldName: 'Pair', filterValue: ['No'] },
 *     { fieldName: 'Lift Height (in)', filterValue: ['10.32'] }
 *   ]
 * };
 *
 * If isLocalhost is false
 * queryObjectToUrl(filterObj);
 * // Returns: '/part-category/jacks?df_Pair=No&df_Lift%20Height%20(in)=10.32'
 *
 * If isLocalhost is true
 * queryObjectToUrl(filterObj);
 * // Returns: '/part-category/?category=jacks&df_Pair=No&df_Lift%20Height%20(in)=10.32'
 */
export const queryObjectToUrl = (obj) => {
  const params = [];

  const metaCategory = getCategory();

  const subcatParam = isLocalhost ? `?category=${metaCategory}&` : '?';
  const base = window.location.pathname + subcatParam;

  if (obj.dynamicFilters && obj.dynamicFilters.length > 0) {
    obj.dynamicFilters.forEach((filter) => {
      const fieldName = filter.fieldName;
      const filterValues = filter.filterValue;

      if (fieldName && filterValues && filterValues.length > 0) {
        const key = `df_${encodeURIComponent(fieldName)}`;
        const value = filterValues.map(encodeURIComponent).join(',');
        params.push(`${key}=${value}`);
      }
    });
  }

  let finalUrl = base + params.join('&');

  // Remove trialing '&' or '?' if no filter is selected
  if (obj.dynamicFilters.length === 0) {
    finalUrl = finalUrl.slice(0, -1);
  }

  return finalUrl;
};

/**
 * Parses a full URL string, extracts specific URL search parameters prefixed with 'df_'
 * (dynamicFilters), and transforms them back into an object.
 *
 * This function is the inverse of `queryObjectToUrl`. It correctly decodes field names and
 * comma-separated filter values from the URL query string.
 *
 * @param {string} url - The complete URL string containing dynamic filter parameters (e.g., 'https://example.com/products?df_Brand=Sony%2CLG&df_Price=Low').
 * @returns {object} An object containing the extracted dynamic filters.
 * @returns {Array<Object>} return.dynamicFilters - An array of dynamic filter objects.
 * @returns {string} return.dynamicFilters[].fieldName - The decoded name of the filter field (e.g., 'Brand').
 * @returns {Array<string>} return.dynamicFilters[].filterValue - An array of decoded selected values for the field (e.g., ['Sony', 'LG']).
 *
 * @example
 * // Input URL:
 * const url = '/part-category/jacks?df_Pair=No&df_Lift%20Height%20(in)=10.32';
 *
 * urlToQueryObject(url);
 * // Output:
 * {
 *   dynamicFilters: [
 *     { fieldName: 'Pair', filterValue: ['No'] },
 *     { fieldName: 'Lifth Height (in)', filterValue: ['10.32'] }
 *   ]
 * }
 */
export const urlToQueryObject = (url) => {
  let urlObject;
  try {
    urlObject = new URL(url);
  } catch (e) {
    console.error('Invalid URL provided:', e);
    return { dynamicFilters: [] };
  }

  const searchParams = urlObject.searchParams;
  const result = {
    dynamicFilters: [],
  };

  for (const [key, value] of searchParams.entries()) {
    if (key.startsWith('df_')) {
      const encodedFieldName = key.substring(3);
      const fieldName = decodeURIComponent(encodedFieldName);

      const filterValue = value.split(',').map(decodeURIComponent);

      result.dynamicFilters.push({
        fieldName: fieldName,
        filterValue: filterValue,
      });
    }
  }

  return result;
};

/**
 * Utility function to serialize an object to JSON and store it in sessionStorage.
 *
 * @param {string} key - The key under which to store the object in sessionStorage.
 * @param {object} obj - The object to be serialized and stored.
 * @returns {void}
 */
const updateSessionStorage = (key, obj) => {
  const jsonString = JSON.stringify(obj);
  sessionStorage.setItem(key, jsonString);
};

/**
 * Dispatches a custom event on the document with a specified name and payload.
 * Components across the application can listen for this event to react to state changes.
 *
 * @param {string} query - The name of the custom event to dispatch (e.g., 'QueryUpdated').
 * @param {object} payload - The data object to include in the event's `detail` property.
 * @returns {void}
 * @fires {CustomEvent} document#query - Dispatches an event with the name provided in `query`.
 */
export const triggerCustomEventWithPayload = (query, payload) => {
  const event = new CustomEvent(query, { detail: payload });
  document.dispatchEvent(event);
};

/**
 * Updates the browser's current URL based on the provided query object without
 * reloading the page, using the History API's `replaceState` method.
 *
 * @param {object} obj - The query object (containing filters, etc.) to convert into a URL string.
 * @returns {void}
 * @requires queryObjectToUrl - Assumes a function with this name exists globally to convert the object to a URL string.
 */
const updateUrl = (obj) => {
  // NOTE: Assuming queryObjectToUrl is the function that converts the object into a URL string.
  // It should be the same as the previously documented `objectToUrl` (or similar).
  const newUrl = queryObjectToUrl(obj);
  window.history.replaceState(null, '', newUrl);
};

/**
 * The main orchestrator function for managing the global query object.
 *
 * It updates the query in three ways:
 * 1. Persistence: Calls `updateSessionStorage` to save the object.
 * 2. Communication: Calls `triggerCustomEventWithPayload` to notify subscribers.
 * 3. Synchronization: Calls `updateUrl` to synchronize the browser's address bar.
 *
 * The operation is wrapped in a try/catch block to silently handle and log errors
 * related to storage, event dispatch, or the History API.
 *
 * @param {string} key - The key used for session storage persistence.
 * @param {object} newObject - The new query object to be saved and broadcasted.
 * @returns {void}
 * @fires document#QueryUpdated - Dispatched internally by `triggerCustomEventWithPayload`.
 */
export const updateGlobalQueryObject = (key, newObject) => {
  try {
    updateSessionStorage(key, newObject);
    triggerCustomEventWithPayload('QueryUpdated', newObject);
    updateUrl(newObject);
  } catch (error) {
    console.error('Error updating query object:', error);
  }
};
