
/**
 * extract target and keywords from sparql query
 * @param     {String}          sparql            sparql query string
 * @returns   {Object}          for the sparql query extracted target and keywords
 *
 */
export default function extractTargetKeyword(sparql) {
  //extract all entities
  let entities = sparql.match(/wd:Q[0-9]*/g) ;

  //replace wd: prefix
  entities.forEach((item, index) => {
    entities[index] = item.replace('wd:', '');
  });

  //extract instance triple
  let instance = sparql.match(/wdt:P31 wd:Q[0-9]*/g) ;

  //extract target
  let target = instance[0].match(/wd:Q[0-9]*/g)[0].replace('wd:', '') ;

  //get only keywords
  let keywords = entities.filter(entity => entity != target) ;

  return {sparql: sparql , target: target , keywords:keywords} ;

}
