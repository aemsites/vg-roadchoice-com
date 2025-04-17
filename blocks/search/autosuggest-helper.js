import { fetchCrossReferenceSuggest, fetchPartReferenceSuggest } from './graphql-api.js';
import { createElement } from '../../scripts/common.js';

const blockName = 'search';

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
    searchBtn?.click();
  }
}

function buildSuggestion(suggestions, form) {
  const suggestionElements = [];
  const searchBtn = form.querySelector(`.${blockName}__input-cr__submit`);
  const inputElement = [...form.querySelectorAll('input')].find((input) => input.offsetParent !== null);
  suggestions.forEach((suggestion) => {
    const item = createElement('li', { classes: `${blockName}__autosuggest-item`, props: { role: 'option' } });
    item.textContent = suggestion;
    item.addEventListener('click', (e) => handleClickSuggestion(e, searchBtn, inputElement));
    suggestionElements.push(item);
  });
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

export { fetchAutoSuggestions, buildSuggestion, handleArrowKeys };
