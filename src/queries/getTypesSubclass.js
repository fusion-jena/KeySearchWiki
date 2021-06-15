import Cache         from './../util/cache' ;
import runRequest    from './../util/wikidata/runRequest' ;

/**
 * get direct types and all types and indirect types through subclass hierarchy
 * usage : check  if entities are either from target type or from a type that is in the subclass hierarchy of the target
 * @param     {Array}             values    list of iris
 * @param     {Function}          request   function to issue (sparql) queries
 * @returns   {(Promise|Array)}   returns promise if we issue query to endpoint or direct array of result if data in cache
 */

//init cache
let cacheTypeSubclass = new Cache('types_subclass', 'page') ;

export default async function getTypesSubclass(values , request) {
  let variable = 'page' ;

  function getQueryString(iris){ return `
    SELECT ?page ?type WHERE {
      VALUES ?page {${iris}}
      OPTIONAL {?page wdt:P31/wdt:P279* ?type .} .
    }
    `;
  }

  let result = await runRequest(request, cacheTypeSubclass, variable , values , getQueryString) ;
  return result ;

}
