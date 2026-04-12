import path from "node:path";
import * as sass from "sass";
import { DateTime } from "luxon";

export default function (config) {
  // add SCSS template format
  config.addTemplateFormats("scss");

  config.addPassthroughCopy("./src/main.js");

  // Set directories to pass through to the dist folder
  config.addPassthroughCopy("./src/assets");
  config.addPassthroughCopy("./src/scripts");
  config.addPassthroughCopy("./src/admin");

  // Configure SCSS files
  config.addExtension("scss", {
    outputFileExtension: "css",

    // opt-out of Eleventy Layouts
    useLayouts: false,

    compile: async function (inputContent, inputPath) {
      let parsed = path.parse(inputPath);
      // Don’t compile file names that start with an underscore
      if (parsed.name.startsWith("_")) {
        return;
      }

      let result = sass.compileString(inputContent, {
        loadPaths: [parsed.dir || ".", this.config.dir.includes],
      });

      // Map dependencies for incremental builds
      this.addDependencies(inputPath, result.loadedUrls);

      return async (data) => {
        return result.css;
      };
    },
  });

  config.addWatchTarget("./src/scss/");

  // add date filter
  config.addFilter("readableDate", (dateObj) => {
    return DateTime.fromISO(dateObj).toLocaleString(DateTime.DATE_MED);
  });

  config.addFilter("dayOfMonth", (dateObj) => {
    const day = DateTime.fromISO(dateObj).day.toString();
    const suffices = [
      "th",
      "st",
      "nd",
      "rd",
      "th",
      "th",
      "th",
      "th",
      "th",
      "th",
    ];
    let suffix = suffices[day.substring(day.length - 1)];
    if (day > 10 && day < 20) {
      suffix = "th";
    }
    return day + suffix;
  });

  config.addFilter("day", (dateObj) => {
    return DateTime.fromISO(dateObj).day;
  });

  // add amount filter
  config.addFilter("amountWithSign", (amountObj) => {
    if (amountObj >= 0) {
      return `+$${amountObj.toFixed(2)}`;
    } else {
      const amount = amountObj * -1;
      return `-$${amount.toFixed(2)}`;
    }
  });
  config.addFilter("amountWithDecimals", (amountObj, minimum) => {
    return amountObj.toLocaleString("en-US", {
      minimumFractionDigits: minimum,
      maximumFractionDigits: 2,
    });
  });
  // add amount filter
  config.addFilter("amount", (amountObj) => {
    return (
      "$" + amountObj.toLocaleString("en-US", { maximumFractionDigits: 2 })
    );
  });

  // add collections
  config.addCollection("transactions", async (collectionsApi) => {
    const allGlobalData = collectionsApi.getAll()[0].data;
    return allGlobalData.data.transactions.sort(function (a, b) {
      return b.date - a.date;
    });
  });

  config.addCollection("recurring", async (collectionsApi) => {
    const allGlobalData = collectionsApi.getAll()[0].data;
    return allGlobalData.data.transactions.sort(function (a, b) {
      const dayA = DateTime.fromISO(a.date);
      const dayB = DateTime.fromISO(b.date);
      return dayA.day - dayB.day;
    });
  });

  // add category filter
  config.addFilter("categoryFilter", function (collection, category) {
    return collection.filter((item) => item.category === category);
  });

  return {
    pathPrefix:
      process.env.NODE_ENV === "production" ? "/personal-finance-app/" : "/",
    markdownTemplateEngine: "njk",
    dataTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dir: {
      input: "src",
      output: "dist",
    },
  };
}
