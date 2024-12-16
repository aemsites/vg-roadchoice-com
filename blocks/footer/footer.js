import { checkLinkProps, createElement } from '../../scripts/common.js';
import { decorateIcons, getMetadata } from '../../scripts/aem.js';

const blockName = 'footer';

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  block.textContent = '';

  // fetch footer content
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const resp = await fetch(`${footerPath}.plain.html`, window.location.pathname.endsWith('/footer') ? { cache: 'reload' } : {});

  if (resp.ok) {
    const html = await resp.text();

    // decorate footer DOM
    const footer = createElement('div');
    footer.innerHTML = html;

    decorateIcons(footer);

    const children = footer.querySelectorAll('div');
    const [social, internal, privacy] = children;

    social.classList.add(`${blockName}-social-section`);
    internal.classList.add(`${blockName}-internal-section`);
    privacy.classList.add(`${blockName}-privacy-section`);

    social.querySelectorAll('a').forEach((link) => {
      link.target = '_blank';
      const linkText = link.innerText.replace(' ', '-').toLowerCase();
      const icon = createElement('i', { classes: ['social-icon', 'fa-brands', `fa-${linkText}`] });
      link.innerHTML = '';
      link.appendChild(icon);
    });

    checkLinkProps(internal.querySelectorAll('a'));
    checkLinkProps(privacy.querySelectorAll('a'));

    const privacyChildren = privacy.querySelectorAll('a');
    const lastChild = privacyChildren[privacyChildren.length - 1];
    lastChild.target = '_blank';

    block.append(footer);
  }
}
