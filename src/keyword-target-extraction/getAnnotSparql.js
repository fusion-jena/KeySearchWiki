
/**
 * get target and keyword annotations from sparql query
 * @param     {String}          sparql            sparql query string
 * @param     {Array}           allTargetLabels   list of targets with their labels
 * @param     {Array}           allTypes          array of keywords and their types
 * @returns   {Object}          object of annotations
 */
export default function getAnnotSparql(sparql, allTargetLabels, allTypes) {
  let annotations = { sparqlQuery: sparql.sparql, target:'' , targetLabel:'' , keywords:[]} ;

  annotations.target = sparql.target ;
  let targetLabel = allTargetLabels.find( label => label.iri == sparql.target);
  annotations.targetLabel = targetLabel.result[0].iriLabel ;

  let types = [];

  sparql.keywords.forEach(key => {
    let type = allTypes.find(item => item.iri == key);
    types.push(type);
  });

  types.forEach(keyword => {
    let entry = {iri:keyword.iri, label:keyword.result[0].iriLabel, types: []};
    keyword.result.forEach(type => {
      if(type.hasOwnProperty('type')){
        entry.types.push({type: type.type, typeLabel: type.typeLabel});
      }
    });

    annotations.keywords.push(entry);
  });

  return annotations ;

}
