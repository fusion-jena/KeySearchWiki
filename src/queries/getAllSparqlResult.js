import Cache                    from './../util/cache' ;
import getSparql                from './getSparql' ;
import {transformToCacheFormat} from './../util/wikidata/formatResult';
/**
 * get result of all sparql query corresponding to set category
 * @param     {Function}          request   function to issue (sparql) queries
 * @param     {Array}             queries   list of queries to execute
 * @returns   {(Promise|Array)}   returns promise if we issue query to endpoint or direct array of result if data in cache
 */

//init cache
let cacheSparqlResult = new Cache('sparql_results', 'query') ;

export default async function getAllSparqlResult( request , queries) {

  let variable = 'query' ;
  let reqs = [];
  let resp = [];
  let found = [];

  for (let i = 0; i < queries.length; i++) {
    let formatSparql = queries[i].sparql.replace(/[^A-Z0-9]/ig, '');
    let ask = cacheSparqlResult.getValues([formatSparql]);
    if(ask.misses.length == 0){
      found = [...found, ...ask.hits];
    }
    else{
      reqs.push(request(getSparql(formatSparql,queries[i].sparql)));
    }
  }

  if(reqs.length > 0){
    let res = await Promise.all(reqs) ;

    res.forEach(item => {
      let prefix = 'http://query.wikidata.org/bigdata/namespace/wdq/';
      if(item.hasOwnProperty('skipReason')){
        item = [{[variable]: item.query.match(/\<(.*?)\>/)[1], item: 'timeout', itemLabel:'timeout'}];
      }
      item.forEach(element => {
        if(element[variable].includes(prefix)){
          element[variable] = element[variable].replace(prefix, '');
        }
      });
      resp = [...resp, ...item] ;
    });

    let values = queries.map(item => item = item.sparql.replace(/[^A-Z0-9]/ig, ''));

    let respFormatted = transformToCacheFormat(resp, variable, values) ;
    cacheSparqlResult.setValues(respFormatted);
    return [...found , ... respFormatted];
  }

  return found ;

}
