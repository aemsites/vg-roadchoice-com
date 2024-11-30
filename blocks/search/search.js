import { createElement, getTextLabel, getLocaleContextedUrl } from '../../scripts/common.js';
import { fetchFilterFacets } from '../search/graphql-search.js';

const blockName = 'search';
let isCrossRefActive = true;
export const amountOfProducts = 12;
export const fitAmount = 5000;

const PLACEHOLDERS = {
  crossReference: getTextLabel('cross-reference_number'),
  partNumber: getTextLabel('part_number_or_description'),
  partNumberLabel: getTextLabel('part_number_slash_description'),
};

const TEMPLATES = {
  searchBy: `
  <div class="search__search-by__container">
    <label class="search__search-by__label" name="SearchBy">Search By</label>
    <div class="search__buttons__wrapper">
      <button class="button search__cross-reference__btn shadow active" type="button" name="crossReference">
        Cross-Reference
      </button>
      <button class="button search__part-number__btn shadow" type="button" name="partNumber">
        Part Number
      </button>
    </div>
  </div>
  `,
  filters: `
  <div class="search__filters__container">
    <div class="search__make-filter__wrapper">
      <label class="search__make-filter__label">Make</label>
      <select class="search__make-filter__select shadow">
        <option value="null">Make (All)</option>
      </select>
    </div>
    <div class="search__model-filter__wrapper">
      <label class="search__model-filter__label">Model</label>
      <select class="search__model-filter__select shadow" disabled>
        <option value="null">Model (All)</option>
      </select>
    </div>
  </div>
  `,
  filtersResetOpt: `
    <option value="null">Model (All)</option>
  `,
  inputCR: `
  <div class="search__input-cr__container">
    <label class="search__input-cr__label">Cross-Reference Number</label>
    <div class="search__input-cr__wrapper">
      <input class="search__input-cr__input shadow" type="search" placeholder="${PLACEHOLDERS.crossReference}" />
      <button class="button search__input-cr__submit shadow search-button" type="submit">
        SEARCH &nbsp;
        <span class="fa fa-search"></span>
      </button>
    </div>
  </div>
  `,
  inputPN: `
  <div class="search__input-pn__container">
    <label class="search__input-pn__label">${PLACEHOLDERS.partNumberLabel}</label>
    <div class="search__input-pn__wrapper">
      <input class="search__input-pn__input shadow" type="search" placeholder="${PLACEHOLDERS.partNumber}" />
      <button class="button search__input-pn__submit shadow search-button" type="submit">
        SEARCH &nbsp;
        <span class="fa fa-search"></span>
      </button>
    </div>
  </div>
  `,
};

function resetModelsFilter(models, disabled = true) {
  models.innerHTML = TEMPLATES.filtersResetOpt;
  models.disabled = disabled;
}

function addSearchByListeners(wrapper, form) {
  wrapper.onclick = (e) => {
    if (e.target.classList.contains('active')) return;
    // swap between search-by buttons
    form.querySelector(`.${blockName}__cross-reference__btn`).classList.toggle('active', !isCrossRefActive);
    form.querySelector(`.${blockName}__part-number__btn`).classList.toggle('active', isCrossRefActive);
    isCrossRefActive = !isCrossRefActive;
    // swap inputs and filters
    form.querySelector(`.${blockName}__filters-input__container`).classList.toggle('hide', isCrossRefActive);
    form.querySelector(`.${blockName}__input-cr__container`).classList.toggle('hide', !isCrossRefActive);
    // remove the value from the not active input
    form.querySelector(`.${blockName}__input-${isCrossRefActive ? 'pn' : 'cr'}__input`).value = '';
    // reset filters
    if (isCrossRefActive) {
      form.querySelector(`.${blockName}__make-filter__select`).selectedIndex = 0;
      resetModelsFilter(form.querySelector(`.${blockName}__model-filter__select`));
    }
  };
}

function populateFilter(select, items) {
  const docRange = document.createRange();
  let htmlFragment = '';
  const urlParams = new URLSearchParams(window.location.search);
  items.forEach((item) => {
    const itemValue = urlParams.get('cat') ? item.toLowerCase() : item;
    htmlFragment += `
      <option value="${itemValue}">${item}</option>
    `;
  });
  const fragment = docRange.createContextualFragment(htmlFragment);
  select.appendChild(fragment);
}

async function getAndApplyFiltersData(form) {
  const makeSelect = form.querySelector(`.${blockName}__make-filter__select`);
  const modelsSelect = form.querySelector(`.${blockName}__model-filter__select`);
  const fetchedMakeFacets = await fetchFilterFacets({ field: 'MAKE' });
  const makeFacets = fetchedMakeFacets.facets.facets;
  const makeItems = makeFacets.map((facet) => facet.key);
  populateFilter(makeSelect, makeItems);
  makeSelect.onchange = async (e) => {
    const isNotNull = e.target.value !== 'null';
    // if is null then disable the models filter
    if (!isNotNull) {
      resetModelsFilter(modelsSelect);
      return;
    }
    // if is not null then enable the select and then is filled by the maker value
    const fetchedModelFacets = await fetchFilterFacets({ field: 'NAME', filter: makeSelect.value });
    const modelFacets = fetchedModelFacets.facets.facets;
    const modelItems = modelFacets.map((facet) => facet.key);
    resetModelsFilter(modelsSelect, false);
    populateFilter(modelsSelect, modelItems);
  };
}

function getFieldValue(selector, items) {
  return items.filter((item) => item.classList.contains(selector))[0]?.value;
}

function addFormListener(form) {
  form.onsubmit = (e) => {
    e.preventDefault();
    const items = [...form];
    const value = getFieldValue(`${blockName}__input-${isCrossRefActive ? 'cr' : 'pn'}__input`, items);
    const makeFilterValue = getFieldValue(`${blockName}__make-filter__select`, items);
    const modelFilterValue = getFieldValue(`${blockName}__model-filter__select`, items);
    const searchType = isCrossRefActive
      ? 'cross'
      : `parts${makeFilterValue ? `&make=${makeFilterValue}` : ''}${modelFilterValue ? `&model=${modelFilterValue}` : ''}`;
    const offset = 0;
    const url = new URL(window.location.href);
    url.pathname = getLocaleContextedUrl('/search/');
    url.search = `?q=${value}&st=${searchType}&offset=${offset}`;
    window.location.href = url;
  };
}

export default function decorate(block) {
  const formWrapper = createElement('div', { classes: `${blockName}-wrapper` });
  const form = createElement('form', { classes: `${blockName}-form` });
  const pnContainer = createElement('div', { classes: [`${blockName}__filters-input__container`, 'hide'] });
  form.innerHTML = TEMPLATES.searchBy + TEMPLATES.inputCR;
  // Part number input and its filters are hidden by default
  pnContainer.innerHTML = TEMPLATES.filters + TEMPLATES.inputPN;
  form.appendChild(pnContainer);
  // add listeners and fill filters with data
  addSearchByListeners(form.querySelector(`.${blockName}__buttons__wrapper`), form);
  getAndApplyFiltersData(form);
  addFormListener(form);
  // insert templates to form
  formWrapper.appendChild(form);
  block.appendChild(formWrapper);
}
