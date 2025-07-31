import * as cheerio from "cheerio";

export async function fetchHtml(url: string) {
  const response = await fetch(url);
  const html = await response.text();

  const $ = cheerio.load(html);
  const cleanHtml = $("body").prop("innerHTML");
  return cleanHtml;
}
