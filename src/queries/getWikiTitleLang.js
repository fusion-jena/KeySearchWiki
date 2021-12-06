import Cache         from './../util/cache' ;
import runRequest    from './../util/wikidata/runRequest' ;

/**
 * query title and language of corresponding wikipedia category pages
 * @param     {Array}             values    list of categories
 * @param     {Function}          request   function to issue (sparql) queries
 * @returns   {(Promise|Array)}   returns promise if we issue query to endpoint or direct array of result if data in cache
 */

//init cache
let cacheCatTitlesLangs = new Cache('cat_titles_langs', 'catIRI') ;

export default async function  getWikiTitleLang(values, request) {
  let variable = 'catIRI';

  function getQueryString(iris){return `
    SELECT ?catIRI ?title ?lang WHERE {
      VALUES ?catIRI {${iris}}
    OPTIONAL{
      ?wikiArticle schema:about ?catIRI .
      ?wikiArticle schema:name ?title .
      ?wikiArticle schema:isPartOf ?langWiki.
      FILTER(REGEX(STR(?langWiki), "wikipedia.org")).
      BIND (REPLACE(REPLACE(STR(?langWiki), "https://", ""),".wikipedia.org/", "")  AS ?lang).
    }
  }
    `;
  }

  let result = await runRequest(request, cacheCatTitlesLangs, variable , values , getQueryString) ;
  return result ;

}
