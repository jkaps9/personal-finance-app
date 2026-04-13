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

  // add collectionss
  config.addCollection("transactions", (collectionsApi) => {
    // 1. Grab the data cascadee
    const itemData = collectionsApi.getAll()[0]?.data;

    // 2. Safely locate the transactions array (checking b the possible paths)
    const transactionsList =
      itemData?.transactions || itemData?.data?.transactions;

    // 3. If no data is found, return an empty array to prevent build crashes
    if (!transactionsList || !Array.isArray(transactionsList)) {
      console.warn("Could not find transactions array in global data.");
      return [];
    }

    // 4. Spread into a new array [...] to prevent mutating the original,
    // and sort descending using string comparison.
    return [...transactionsList].sort((a, b) => b.date.localeCompare(a.date));
  });

  config.addCollection("recurring", async (collectionsApi) => {
    const allGlobalData = collectionsApi.getAll()[0].data;
    const transactions = allGlobalData.data.transactions;

    const sorted = transactions.sort(function (a, b) {
      const dayA = DateTime.fromISO(a.date);
      const dayB = DateTime.fromISO(b.date);
      return dayA.day - dayB.day;
    });

    const sortedSet = new Set();
    return sorted.filter((item) => {
      if (sortedSet.has(item.name)) {
        return false;
      } else {
        sortedSet.add(item.name);
        return true;
      }
    });
  });

  // add category filter
  config.addFilter("categoryFilter", function (collection, category) {
    return collection.filter((item) => item.category === category);
  });

  config.addFilter("sumByCategory", function (collection, category) {
    return collection
      .filter((item) => item.category === category)
      .reduce((accumulator, item) => {
        return accumulator + (-1 * item.amount || 0);
      }, 0);
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
