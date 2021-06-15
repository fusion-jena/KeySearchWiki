import Cache         from './../util/cache' ;
import runRequest    from './../util/wikidata/runRequest' ;

/**
 * get iris labels
 * @param     {Array}             values    list of iris
 * @param     {Function}          request   function to issue (sparql) queries
 * @returns   {(Promise|Array)}   returns promise if we issue query to endpoint or direct array of result if data in cache
 */

//init cache
let cacheLabels = new Cache('labels', 'iri') ;

export default async function getLabel(values, request) {
  let variable = 'iri';

  function getQueryString(iris){return `
    SELECT ?iri ?iriLabel
     WHERE
     {
       VALUES ?iri {${iris}}
       SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
       }
    `;
  }

  let result = await runRequest(request, cacheLabels, variable , values , getQueryString) ;
  return result ;


}
