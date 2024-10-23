// eslint-disable-next-line import/no-unresolved
import { PLUGIN_EVENTS } from 'https://www.hlx.live/tools/sidekick/library/events/events.js';

async function getAuthorData() {
  const resp = await fetch('/authors.json?limit=5000');
  if (resp.ok) {
    const json = await resp.json();
    return json.data;
  }
  throw new Error('Error fetching authors.json');
}

function getFilteredAuthors(data, query) {
  if (!query) {
    return data;
  }

  return data.filter(
    (item) => item.name.toLowerCase().includes(query.trim().toLowerCase()) || item['author-id'].toLowerCase().includes(query.trim().toLowerCase()),
  );
}

export async function decorate(container, ignored, query) {
  const data = await getAuthorData();

  const createMenuItems = () => {
    const filteredAuthors = getFilteredAuthors(data, query);
    return filteredAuthors
      .map(
        (item) => `
        <sp-menu-item value="${item.name} (${item['author-id']})">
          ${item.name} <span class="author-id">(${item['author-id']})</span>
        </sp-menu-item>
      `,
      )
      .join('');
  };

  const handleCopyButtonClick = (e) => {
    const { value } = e.target;
    navigator.clipboard.writeText(value);
    container.dispatchEvent(
      new CustomEvent(PLUGIN_EVENTS.TOAST, {
        detail: { message: 'Copied Author' },
      }),
    );
  };

  const spContainer = document.createElement('div');
  spContainer.classList.add('container');
  spContainer.innerHTML = `
    <sp-menu >
      ${createMenuItems()}
    </sp-menu> `;
  container.append(spContainer);

  spContainer.querySelectorAll('sp-menu-item').forEach((item) => {
    item.addEventListener('click', handleCopyButtonClick);
  });
}

export default {
  title: 'Authors',
  searchEnabled: true,
};
