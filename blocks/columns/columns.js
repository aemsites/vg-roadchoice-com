import { createElement } from '../../scripts/common.js';

const blockName = 'columns';

const addAnchorWrapper = (pic) => {
  const parent = pic.parentElement;
  const sibling = parent.nextElementSibling;
  let wrapper;

  if (sibling) {
    const textCheck = sibling.textContent.trim().toLowerCase() === 'image-link';
    const nodeCheck = sibling.nodeName === 'A' || sibling.nodeName === 'P';

    if (textCheck && nodeCheck) {
      wrapper = sibling.querySelector('a');
      wrapper.textContent = '';
      wrapper.classList = '';
      wrapper.append(pic);
      parent.closest('div').append(wrapper);

      const texts = parent.closest('div').querySelectorAll('p');
      texts.forEach((text) => text.remove());
      sibling.remove();
    }
  }
};

const buildThreeCols = (pic) => {
  const parent = pic.parentElement;
  const link = parent.querySelector('a');

  if (link) {
    const textCheck = link.textContent.trim().toLowerCase() === 'image-link';
    if (textCheck) {
      link.textContent = '';
      link.classList = '';
      link.append(pic);
      parent.append(link);
      const texts = parent.closest('div').querySelectorAll('p');
      texts.forEach((text) => text.remove());
    } else if (!textCheck) {
      const wrapper = createElement('a', { props: { href: link.href } });
      wrapper.append(pic);
      parent.insertAdjacentElement('afterbegin', wrapper);
      link.classList.add('button', 'primary');
    }
  }
};

export default function decorate(block) {
  const cols = [...block.firstElementChild.children];
  block.classList.add(`${blockName}-${cols.length}-cols`);

  const isThreeCols = cols.length === 3;

  const spaces = block.querySelectorAll('br');
  spaces.forEach((space) => space.remove());

  // setup image columns
  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      const pic = col.querySelector('picture');
      if (pic) {
        if (isThreeCols) {
          buildThreeCols(pic);
        } else {
          addAnchorWrapper(pic);
        }

        const picWrapper = pic.closest('div');
        if (picWrapper && picWrapper.children.length === 1) {
          // picture is only content in column
          picWrapper.classList.add(`${blockName}-img-col`);
        }
      }
    });
  });
}
