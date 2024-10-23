import { createElement, getTextLabel, getJsonFromUrl, getLocaleContextedUrl } from '../../scripts/common.js';
import { getMetadata } from '../../scripts/lib-franklin.js';

const blockName = 'recommendations';
const category = getMetadata('category');
const title = getTextLabel('recommendations_title');
const linkText = getTextLabel('read_more');

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

export const clearRepeatedArticles = (articles) =>
  articles.filter((e) => {
    const currentArticlePath = window.location.href.split('/').pop();
    const path = e.path.split('/').pop();
    if (path !== currentArticlePath) return e;
    return null;
  });

const formatDate = (date) => {
  const convertedDate = new Date(parseInt(date, 10) * 1000);

  const day = convertedDate.getDate();
  const month = convertedDate.getMonth() + 1;
  const year = convertedDate.getFullYear();

  return `${month}/${day}/${year}`;
};

export default async function decorate(block) {
  const limit = Number(getLimit(block));
  const route = getLocaleContextedUrl('/blog/query-index.json');
  const { data: allArticles } = await getJsonFromUrl(route);

  const sortedArticles = allArticles.sort((a, b) => {
    a.date = +a.date;
    b.date = +b.date;
    return b.date - a.date;
  });
  const filteredArticles = clearRepeatedArticles(sortedArticles);
  const artByCategory = category ? filteredArticles.filter((e) => e.category.toLowerCase() === category.toLowerCase()) : filteredArticles;
  const selectedArticles = artByCategory.slice(0, limit);

  const noArticles = selectedArticles.length === 0;

  const recommendationsContent = createElement('div', { classes: `${blockName}-content` });
  const titleSection = createElement('div', { classes: ['title-section'] });

  const titleElement = createElement('h3', { classes: ['title'] });
  titleElement.innerText = isBlogArticle ? recommendationsTitle : homeTitle;

  if (isBlogArticle) {
    titleSection.appendChild(titleElement);
  } else {
    const link = createElement('a', { classes: ['link'] });
    link.append(titleElement);
    titleSection.appendChild(link);
  }

  const recommendationsList = createElement('ul', { classes: `${blockName}-list` });

  selectedArticles.forEach((art) => {
    const article = createElement('li', { classes: ['article'] });

    const articleTitle = createElement('h2', { classes: ['article-title'] });
    const articleTitleLink = createElement('a', { classes: ['article-title-link'], props: { href: art.path } });
    articleTitleLink.innerText = art.title;

    articleTitle.appendChild(articleTitleLink);

    const articleDate = createElement('p', { classes: ['article-date'] });
    articleDate.innerText = formatDate(art.date);

    const articleText = createElement('p', { classes: ['article-text'] });
    articleText.innerText = art.description;

    const strongLink = createElement('strong');
    const articleLink = createElement('a', { classes: ['article-link'], props: { href: art.path } });
    articleLink.innerText = linkText;
    strongLink.appendChild(articleLink);

    article.append(articleTitle, isBlogArticle ? articleDate : '', articleText, strongLink);

    recommendationsList.appendChild(article);
  });
  recommendationsContent.append(titleSection, recommendationsList);

  block.textContent = '';
  if (!noArticles) block.appendChild(recommendationsContent);
}
