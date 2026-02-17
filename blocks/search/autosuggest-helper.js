import { fetchCrossReferenceSuggest, fetchPartReferenceSuggest, fetchFuzzySuggest } from '../../scripts/graphql-api.js';
import { createElement, getTextLabel } from '../../scripts/common.js';
import { blockName } from './search.js';

function handleArrowKeys(list, event, activeClassName) {
  const activeItem = list.find((item) => item.classList.contains(activeClassName));
  let index = list.indexOf(activeItem);
  if (event.key === 'ArrowUp') {
    index -= 1;
    if (index === -1) {
      index = list.length - 1;
    }
  } else {
    index += 1;
    if (index > list.length - 1) {
      index = 0;
    }
  }

  if (activeItem) {
    activeItem.classList.remove(activeClassName);
  }

  list[index].classList.add(activeClassName);
  event.target.value = list[index].textContent;
}

function handleClickSuggestion(e, searchBtn, inputElement) {
  if (inputElement) {
    inputElement.value = e.target.textContent;
    const url = new URL(window.location);
    url.searchParams.set('fuzzyness', true);
    window.history.pushState({}, '', url);
    searchBtn?.click();
  }
}

function buildSuggestion(suggestions, form) {
  const suggestionElements = [];
  const searchBtn = form.querySelector(`.${blockName}__input-cr__submit`);
  const crInputContainer = form.querySelector(`.${blockName}__input-cr__container`);
  const inputElement = [...form.querySelectorAll('input')].find((input) => input.offsetParent !== null);
  if (suggestions && suggestions.length) {
    suggestions.forEach((suggestion) => {
      const item = createElement('li', { classes: `${blockName}__autosuggest-item`, props: { role: 'option' } });
      item.textContent = suggestion;
      item.addEventListener('click', (e) => handleClickSuggestion(e, searchBtn, inputElement));
      suggestionElements.push(item);
    });
  } else if (!crInputContainer.classList.contains('hide')) {
    const noSuggestions = createElement('li', { classes: `${blockName}__autosuggest-item--no-results` });
    noSuggestions.textContent = getTextLabel('search:no_suggestion');
    suggestionElements.push(noSuggestions);
  }
  return suggestionElements;
}

async function fetchAutoSuggestions(suggestParams) {
  let results;
  const { term, make, model, category, isCrossRefActive } = suggestParams;
  if (!isCrossRefActive) {
    const suggestParams = {
      term,
      ...(make && { make }),
      ...(model && { model }),
      ...(category && { category }),
    };
    results = await fetchPartReferenceSuggest(suggestParams);
  } else {
    results = await fetchCrossReferenceSuggest({ term });
  }

  const { suggestions: { terms } = {} } = results;

  return terms;
}

function handleFuzzyClick(e, searchBtn, form) {
  const inputElement = [...form.querySelectorAll('input')].find((input) => input.offsetParent !== null);
  handleClickSuggestion(e, searchBtn, inputElement);
}

export async function applyFuzzySearch(fuzzyTerm) {
  const { suggestions } = await fetchFuzzySuggest({ q: fuzzyTerm });
  const searchResultsSection = document.querySelector(`.${blockName}-results-wrapper`);
  const loadingElement = document.querySelector('.loading');
  if (suggestions && suggestions?.length) {
    const fuzzyWrapper = createElement('div', { classes: [`${blockName}__fuzzysearch-results-wrapper`] });
    const fuzzyText = createElement('span', { classes: [`${blockName}__fuzzysearch-results-text`] });
    fuzzyText.textContent = getTextLabel('search:did_you_mean');
    const list = createElement('ul', { classes: [`${blockName}__fuzzysearch-results-list`] });
    const form = document.querySelector(`.${blockName}-form`);
    const searchBtn = form.querySelector(`.${blockName}__input-cr__submit`);
    suggestions.forEach((fuzzy) => {
      const listElement = createElement('li', { classes: [`${blockName}__fuzzysearch-results-item`] });
      listElement.textContent = fuzzy.text;
      listElement.addEventListener('click', (e) => handleFuzzyClick(e, searchBtn, form));
      list.append(listElement);
    });
    const pagination = document.querySelector('.pagination-wrapper');
    const partBtn = document.querySelector(`.${blockName}__part-number__btn`);

    pagination?.classList.add('hide');
    loadingElement?.remove();
    partBtn?.click();

    fuzzyWrapper.append(fuzzyText, list);
    const noResultsTitleEl = createElement('h1', { classes: [`${blockName}__no-results-title`] });
    const noResultsTitleHtml = getTextLabel('search:no_results_title').replace(
      '[$]',
      `<span class="${blockName}__no-results-term">${fuzzyTerm || ''}</span>`,
    );
    noResultsTitleEl.innerHTML = noResultsTitleHtml;

    if (searchResultsSection) {
      searchResultsSection.replaceChildren(noResultsTitleEl, fuzzyWrapper);
    }
  }
  return suggestions;
}

export { fetchAutoSuggestions, buildSuggestion, handleArrowKeys };
