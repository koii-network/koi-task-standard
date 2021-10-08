const cheerio = require("cheerio");

const parseAndSaveAllSelctor = async ($, selector, contentType) => {
  let totalContent = [];
  $(selector).each((index, element) => {
    if (index < 500) {
      // add limitation 500 nodes
      let content = "";
      if (selector === "img") {
        content = $(element).attr("src");
      } else if (selector === "a") {
        content = $(element).attr("href");
      } else {
        content = $(element).text().trim();
      }
      let ids = $(element).attr("id");
      let classNames = $(element).attr("class");
      let subSelectorsArr = [];
      let subSelector = "";
      try {
        while ($(element)[0] && $(element)[0].name && !ids && !classNames) {
          subSelectorsArr.push($(element)[0].name);
          element = $(element).parent();
          ids = $(element).attr("id");
          classNames = $(element).attr("class");
        }
      } catch (e) {
        console.log(e);
        return;
      }
      for (let i = subSelectorsArr.length - 1; i >= 0; i--) {
        subSelector += `>${subSelectorsArr[i]}`;
      }
    }
  });
  return totalContent;
};

const getPayload = async (html) => {
  let $ = await cheerio.load(html);
  $("script").remove();
  $("style").remove();
  $("noscript").remove();
  $("link").remove();
  var payload = {
    title: "",
    content: "",
    image: ""
  };
  var title = "";
  // eslint-disable-next-line no-cond-assign
  if ((title = $('meta[property="og:title"]').attr("content"))) {
    payload.title = title;
    // eslint-disable-next-line no-cond-assign
  } else if ((title = $("meta[name=title]").attr("content"))) {
    payload.title = title;
  } else {
    $("h1,h2,h3,h4,h5,h6,p").each(function (i, elem) {
      if (i === 0) {
        title = $(elem).text().trim();
      }
    });
    if (!title) {
      title = $("title").text().trim();
    }
    payload.title = title;
  }
  return payload;
};

const getScrapData = async (html) => {
  let $ = await cheerio.load(html);

  //If element consists main tag
  if ($('main').length) {
    // console.log('Contains main tag');
    $ = await cheerio.load($('main').html());
  }
  $('script').remove();
  $('style').remove();
  $('nav').remove();
  $('head').remove();
  $('noscript').remove();
  $('link').remove();
  $('meta').remove();
  $('footer').remove();

  const dataImage = await parseAndSaveAllSelctor($, 'img', 'Image')
  const dataLink = await parseAndSaveAllSelctor($, 'a', 'Link')
  const dataText = await parseAndSaveAllSelctor($, 'h1, h2, h3, h4, h5, span, p', 'Text')
  // console.log(dataImage)
  // console.log(dataLink)
  // console.log(dataText)
  return {
    Image: dataImage,
    Link: dataLink,
    Text: dataText
  }
}
export { parseAndSaveAllSelctor, getPayload };
