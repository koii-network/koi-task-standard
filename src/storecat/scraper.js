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
      if ($(element)[0] && $(element)[0].name) {
        const elementType = $(element)[0].name;
        let modifiedClassNames = ""; //contains .
        let modifiedIds = ""; //contains #

        if (classNames) {
          modifiedClassNames = `[class='${classNames}']`;
        }
        if (ids) {
          modifiedIds = `[id='${ids}']`;
        }
        let finalSelector = `${elementType}`;
        if (modifiedClassNames) finalSelector += `${modifiedClassNames}`;
        if (modifiedIds) finalSelector += `${modifiedIds}`;
        finalSelector += subSelector;
        let found = false;
        if ($(finalSelector).length >= 0) {
          $(finalSelector).each(async (i, item) => {
            if (selector === "img") {
              content = $(item).attr("src");
            } else if (selector === "a") {
              content = $(item).attr("href");
            } else {
              content = $(item).text().trim();
            }
            if (!found) {
              // finalSelectorIndex = i;
              let finalSelectorWithIndex = `${i}$` + finalSelector;
              if (
                content &&
                content.trim() !== "" &&
                content[0] !== "#" &&
                totalContent.filter((x) => x.text === content).length === 0
              ) {
                totalContent.push({
                  text: content,
                  type: contentType,
                  selector: finalSelectorWithIndex,
                  label: "sitemap " + contentType
                });
                found = true;
              }
            }
          });
        }
      } else {
        return;
      }
    }
  });
  return totalContent;
};

const getScrapData = async (html) => {
  let $ = await cheerio.load(html);

  //If element consists main tag
  if ($("main").length) {
    // console.log('Contains main tag');
    $ = await cheerio.load($("main").html());
  }
  $("script").remove();
  $("style").remove();
  $("nav").remove();
  $("head").remove();
  $("noscript").remove();
  $("link").remove();
  $("meta").remove();
  $("footer").remove();

  const dataImage = await module.exports.parseAndSaveAllSelctor(
    $,
    "img",
    "Image"
  );
  const dataLink = await module.exports.parseAndSaveAllSelctor($, "a", "Link");
  const dataText = await module.exports.parseAndSaveAllSelctor(
    $,
    "h1, h2, h3, h4, h5, span, p",
    "Text"
  );
  // console.log(dataImage)
  // console.log(dataLink)
  // console.log(dataText)
  return {
    Image: dataImage,
    Link: dataLink,
    Text: dataText
  };
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
  var image = "";
  // image: meta:ogimage OR document.images[0]
  // eslint-disable-next-line no-cond-assign
  if ((image = $('meta[property="og:image"]').attr("content"))) {
    payload.image = image;
  } else {
    $("img").each(function (i) {
      if (i === 0) {
        image = $(this).attr("src");
      }
    });
    payload.image = image;
  }
  payload.content = await getScrapData($("body").html());
  return payload;
};

// export { parseAndSaveAllSelctor, getPayload };
module.exports = {
  parseAndSaveAllSelctor,
  getPayload
};
