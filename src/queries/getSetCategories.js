import Cache                    from './../util/cache' ;
import Config                   from './../config/config';
import {transformToCacheFormat} from './../util/wikidata/formatResult';

/**
 * get set categories and some of their properties
 * @param     {Function}          request   function to issue (sparql) queries
 * @returns   {(Promise|Array)}   returns promise if we issue query to endpoint or direct array of result if data in cache
 */

//init cache
let cacheAllCats = new Cache('Categories', 'setCat') ;
export default async function getSetCategories(request) {

  let variable = 'setCat' ;
  let query =  `
    SELECT ?setCat ?sparql ?contains ?list
    WHERE
    {
      ?setCat wdt:P31 wd:${Config.categoryIRI} .
      OPTIONAL {
          ?setCat wdt:P3921 ?sparql .
          # filter sparql queries that deal with literals
          FILTER(!REGEX(STR(?sparql), "FILTER"))
          # some queries (5) contain union (e.g., multiple targets)
          FILTER(!REGEX(STR(?sparql), "UNION"))
          # in some queries there is no instance of relation (e.g., Q15337205) (cannot determine target from query)
          FILTER(REGEX(STR(?sparql), "wdt:P31"))
          # we search for entities instance of target (exclude entities wdt:P31/wdt:P279* target)
          FILTER(!REGEX(STR(?sparql), "wdt:P31/wdt:P279"))
        }
       OPTIONAL { ?setCat wdt:P4224 ?contains . }
       OPTIONAL { ?setCat wdt:P1753 ?list . }
      #OPTIONAL { ?setCat wdt:P971 ?topics . }
    }
    `;

  let resp ;
  //try to hit cache
  resp = cacheAllCats.getAll();
  if(resp.length == 0 && Config.endpointEnabled){
    // issue query if nothing in cache
    resp = await request(query);
    let respFormatted = transformToCacheFormat(resp, variable, []) ;
    cacheAllCats.setValues(respFormatted);
    return respFormatted ;
  }
  if(resp.length == 0 && !Config.endpointEnabled){
    throw 'categories cache empty !!';
    return ;
  }

  return resp ;
}
