import { createElement, getTextLabel } from '../../scripts/common.js';
import { subcategorySearch } from '../../scripts/graphql-api.js';
import { transformFacets, updateGlobalQueryObject } from '../../scripts/services/part-category.service.js';

const blockName = 'category-filters';
const titleText = getTextLabel('category_filters_title');
const clearText = getTextLabel('category_filters_clear_button');
let queryObject;

const fetchQueryParams = () => {
  try {
    queryObject = JSON.parse(sessionStorage.getItem('query-params'));
  } catch (error) {
    throw new Error('Error getting filters from sessionStorage: ', error);
  }
};

const captureInputsIntoQueryObject = (input) => {
  const {
    value,
    dataset: { filterTitle: key },
  } = input;

  const filterIndex = queryObject.dynamicFilters.findIndex((f) => f.fieldName === key);
  const filterObj = queryObject.dynamicFilters[filterIndex];

  if (filterObj) {
    const valueIndex = filterObj.filterValue.indexOf(value);

    if (valueIndex > -1) {
      filterObj.filterValue.splice(valueIndex, 1);

      if (filterObj.filterValue.length === 0) {
        queryObject.dynamicFilters.splice(filterIndex, 1);
        queryObject.facetFields = queryObject.facetFields.filter((field) => field !== key);
      }
    } else {
      filterObj.filterValue.push(value);
      if (!queryObject.facetFields.includes(key)) {
        queryObject.facetFields.push(key);
      }
    }
  } else {
    queryObject.dynamicFilters.push({
      fieldName: key,
      filterValue: [value],
    });

    if (!queryObject.facetFields.includes(key)) {
      queryObject.facetFields.push(key);
    }
  }
  updateGlobalQueryObject('query-params', queryObject);
};

const updateCheckboxes = (form) => {
  const dynamicFilters = queryObject.dynamicFilters;
  const inputs = form.querySelectorAll(`.${blockName}-input`);

  inputs.forEach((input) => {
    const isPresent = dynamicFilters.some((obj) => obj.filterValue.includes(input.value));
    input.checked = isPresent;
  });
};

const isFilterActive = (key = '') => {
  const dynamicFilters = queryObject.dynamicFilters;
  if (dynamicFilters.length === 0) return false;
  return dynamicFilters.some((item) => item.fieldName === key);
};

const isClearBtnEnabled = () => queryObject.dynamicFilters.length < 1;

const renderFilters = (filters, wrapper) => {
  const facetFieldsAggregated = transformFacets(filters);
  const filterKeys = Object.keys(facetFieldsAggregated).sort();
  const filterList = createElement('ul', { classes: `${blockName}-list` });

  filterKeys.forEach((key) => {
    const filterItem = createElement('li', { classes: `${blockName}-item` });
    const titleWrapper = createElement('div', { classes: [`${blockName}-title-wrapper`, 'active'] });

    const filterAttrib = createElement('h6', { classes: `${blockName}-item-title` });
    filterAttrib.textContent = key;
    const plusBtn = createElement('span', { classes: ['plus-btn', 'fa', 'fa-plus'] });
    const filterOptionsWrapper = createElement('ul', { classes: `${blockName}-options-wrapper` });

    if (!isFilterActive(key)) {
      titleWrapper.classList.remove('active');
      filterOptionsWrapper.classList.add('hidden');
    }

    const clearBtn = wrapper.querySelector('.clear-filter-btn');
    clearBtn.disabled = isClearBtnEnabled();

    const attributes = [...facetFieldsAggregated[key]];
    attributes.forEach((el) => {
      const { key: value, doc_count: count } = el;
      if (count === 0) {
        filterItem.classList.add('hidden');
      }
      const filterOption = createElement('li', { classes: `${blockName}-option` });
      const inputId = `${key ? key.replace(' ', '_') : null}<&>${value ? value.replace(' ', '_') : null}`;
      const filterInput = createElement('input', {
        classes: `${blockName}-input`,
        props: {
          type: 'checkbox',
          'data-filter-title': key,
          value: value,
          id: inputId,
        },
      });
      const filterLabel = createElement('label', {
        classes: `${blockName}-label`,
        props: {
          for: inputId,
        },
      });
      filterLabel.textContent = `${value} - (${count})`;
      filterOption.append(filterInput, filterLabel);
      filterOptionsWrapper.appendChild(filterOption);
    });

    titleWrapper.append(filterAttrib, plusBtn);
    filterItem.append(titleWrapper, filterOptionsWrapper);
    filterList.appendChild(filterItem);
  });

  filterList.onclick = (e) => {
    const elements = [`${blockName}-title-wrapper`, `${blockName}-title`, 'plus-btn'];
    if (elements.some((el) => e.target.classList.contains(el))) {
      const element = e.target.classList.contains(`${blockName}-title-wrapper`) ? e.target : e.target.parentElement;
      element.classList.toggle('active');
      element.nextElementSibling.classList.toggle('hidden');
    }
  };

  updateCheckboxes(filterList);

  const hasOldFilters = wrapper.querySelector('ul');
  if (hasOldFilters) {
    hasOldFilters?.remove();
  }
  wrapper.append(filterList);
};

const renderBlock = (block, filters) => {
  const filterTitle = createElement('h3', { classes: `${blockName}-title` });
  filterTitle.textContent = titleText;
  const filterForm = createElement('form', { classes: `${blockName}-form`, props: { id: `${blockName}-form` } });
  const buttonsWrapper = createElement('div', { classes: `${blockName}-buttons-wrapper` });
  const clearFilterBtn = createElement('button', {
    classes: ['clear-filter-btn', 'filter-btn', 'secondary'],
    props: {
      form: `${blockName}-form`,
      id: 'clear-filter-btn',
    },
  });
  clearFilterBtn.textContent = clearText;
  clearFilterBtn.disabled = isClearBtnEnabled();

  buttonsWrapper.append(clearFilterBtn);
  filterForm.append(buttonsWrapper);

  renderFilters(filters, filterForm);

  block.append(filterTitle, filterForm);
};

export const formFiltersListener = (block) => {
  const form = block.querySelector(`.${blockName}-form`);
  form.addEventListener('change', async (e) => {
    if (e.target.type === 'checkbox') {
      captureInputsIntoQueryObject(e.target);

      const filteredQueryResult = await subcategorySearch(queryObject);
      const { facets } = filteredQueryResult;

      renderFilters(facets, form);
    }
  });
};

export default async function decorate(block) {
  fetchQueryParams();

  const initialQuery = await subcategorySearch(queryObject);
  const { facets } = initialQuery;

  renderBlock(block, facets);

  formFiltersListener(block);
}
