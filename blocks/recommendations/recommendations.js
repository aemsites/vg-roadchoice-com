import {
  createElement,
  getTextLabel,
  convertDateExcel,
  getJsonFromUrl,
} from '../../scripts/scripts.js';

const title = getTextLabel('recommendations title');
const linkText = getTextLabel('read more');
const [homeTitle, recommendationsTitle] = title.split('[/]');

const isBlogArticle = document.querySelector('.blog-article');

export const getLimit = (block) => {
  const classes = block.classList;
  let limit;
  classes.forEach((e) => {
    const [name, value] = e.split('-');
    if (name === 'limit') limit = value;
  });
  return limit;
};

export const clearRepeatedArticles = (articles) => articles.filter((e) => {
  const currentArticlePath = window.location.href.split('/').pop();
  const path = e.path.split('/').pop();
  if (path !== currentArticlePath) return e;
  return null;
});

const formatDate = (date) => {
  const convertedDate = new Date(convertDateExcel(date));

  const day = convertedDate.getDate();
  const month = convertedDate.getMonth() + 1;
  const year = convertedDate.getFullYear();

  return `${day}/${month}/${year}`;
};

export default async function decorate(block) {
  const limit = Number(getLimit(block));

  // TODO change this route
  const route = '/drafts/shomps/blog-articles.json';
  const { data: allArticles } = await getJsonFromUrl(route);

  const sortedArticles = allArticles.sort((a, b) => {
    a.date = +(a.date);
    b.date = +(b.date);
    return b.date - a.date;
  });
  const filteredArticles = clearRepeatedArticles(sortedArticles);
  const selectedArticles = filteredArticles.slice(0, limit);

  const recommendationsContent = createElement('div', { classes: ['recommendations-content'] });
  const titleSection = createElement('div', { classes: ['title-section'] });

  const titleElement = createElement('h3', { classes: ['title'] });
  titleElement.innerText = isBlogArticle ? recommendationsTitle : homeTitle;

  if (!isBlogArticle) {
    const link = createElement('a', { classes: ['link'] });
    link.append(titleElement);
    titleSection.appendChild(link);
  } else {
    titleSection.appendChild(titleElement);
  }

  const recommendationsList = createElement('ul', { classes: ['recommendations-list'] });

  selectedArticles.forEach((art) => {
    const article = createElement('li', { classes: ['article'] });

    const articleTitle = createElement('h2', { classes: ['article-title'] });
    const articleTitleLink = createElement('a', { classes: ['article-title-link'], props: { href: art.path } });
    articleTitleLink.innerText = art.title;

    articleTitle.appendChild(articleTitleLink);

    const articleDate = createElement('p', { classes: ['article-date'] });
    articleDate.innerText = formatDate(art.date);

    const articleText = createElement('p', { classes: ['article-text'] });
    articleText.innerText = art.extract;

    const strongLink = createElement('strong');
    const articleLink = createElement('a', { classes: ['article-link'], props: { href: art.path } });
    articleLink.innerText = linkText;
    strongLink.appendChild(articleLink);

    article.append(articleTitle, (isBlogArticle ? articleDate : ''), articleText, strongLink);

    recommendationsList.appendChild(article);
  });
  recommendationsContent.append(titleSection, recommendationsList);

  block.textContent = '';
  block.appendChild(recommendationsContent);
}
