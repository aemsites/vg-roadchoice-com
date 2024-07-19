import { createElement } from '../../scripts/common.js';

const blockName = 'cards';

const buildCards = (block) => {
  const ul = createElement('ul', { classes: `${blockName}-list` });

  [...block.children].forEach((row) => {
    const item = createElement('li', { classes: `${blockName}-item` });
    const cardContent = createElement('div', { classes: `${blockName}-content` });
    const ctas = createElement('div', { classes: `${blockName}-buttons` });

    const image = row.querySelector('picture');

    const headings = [...row.querySelectorAll('h1, h2, h3, h4, h5, h6')];
    headings.forEach((heading) => heading.classList.add(`${blockName}-heading`));

    const buttons = [...row.querySelectorAll('a')];
    buttons.forEach((btn) => btn.classList.add(`${blockName}-button`));

    const textElmts = [];
    row.querySelectorAll('p').forEach((p) => {
      const hasButton = [...p.classList].includes('button-container');
      const isEmpty = (p.textContent.trim().length === 0);

      if (!isEmpty && !hasButton) textElmts.push(p);
    });
    textElmts.forEach((e) => e.classList.add(`${blockName}-text`));

    if (image) {
      image.classList.add(`${blockName}-image`);
      cardContent.appendChild(image);
    }
    cardContent.append(...headings, ...textElmts);
    ctas.append(...buttons);

    item.append(cardContent, ctas);

    ul.append(item);
  });

  block.textContent = '';
  block.append(ul);
};

const buildResourcesCards = (block) => {
  const ul = createElement('ul', { classes: `${blockName}-list` });

  [...block.children].forEach((row) => {
    const image = row.querySelector('picture');
    const aElmt = row.querySelector('a');
    aElmt.classList = (`${blockName}-card`);

    const item = createElement('li', { classes: `${blockName}-item` });

    image.classList.add(`${blockName}-image`);
    aElmt.prepend(image);

    item.appendChild(aElmt);
    ul.append(item);
  });

  block.textContent = '';
  block.append(ul);
};

export default function decorate(block) {
  const variant = [...block.classList];

  // This detects what block needs to be render and calls the corresponding function.
  if (variant.includes('resources')) {
    buildResourcesCards(block);
  } else {
    buildCards(block);
  }
}
