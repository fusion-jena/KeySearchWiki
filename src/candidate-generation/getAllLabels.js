import getLabel                   from './../queries/getLabel';

/**
 * get all labels
 * @param     {Function}    request                  function to issue (sparql) queries
 * @param     {Object}      gathered                 Object containing all keywords and sparql targets
 * @param     {Array}       result      	           result of getSetCategories with grouped properties
 * @param     {Array}       qualifiersCat            result of getQualifiers
 * @param     {Array}       allTypes                 result of getKeywordType
 * @param     {Array}       allSparqlResults         result of getAllSparqlResult
 * @returns   {Object}     contains labels for sparql targets
 */

export default async function getAllLabels( request, gathered, result, qualifiersCat, allTypes, allSparqlResults) {

  //get sparql targets labels (used separatly in annotation step)

  const allTargetLabels = await getLabel(gathered.allSparqlTargets, request);

  // gather all remaining labels
  let neededLabels = new Set();

  //for setcat iris
  result.forEach(item => {
    neededLabels.add(item.setCat);
  });

  //for targets from qualifiers
  qualifiersCat.forEach(qual => {
    qual.result.forEach(res => {
      if(res.hasOwnProperty('target')){
        neededLabels.add(res.target);
      }
    });
  });

  //for all keywords
  gathered.allKeywordIRIs.forEach(item => {
    neededLabels.add(item);
  });

  //for type labels
  allTypes.forEach(entry => {
    entry.result.forEach(res => {
      if(res.hasOwnProperty('type')){
        neededLabels.add(res.type);
      }
    });

  });

  //for all sparql query results
  allSparqlResults.forEach(entry => {
    entry.result.forEach(res => {
      neededLabels.add(res.item);
    });
  });

  //get all labels
  const allLabels = await getLabel([... neededLabels], request);

  let labelsObj = {};

  allLabels.forEach(entry => {
    entry.result.forEach(res => {
      labelsObj[entry.iri] = res.iriLabel;
    });
  });

  //update everything with labels , in the place needed by next steps pipeline

  //update getSetCategories result
  result.forEach(item => {
    item.result['setCatLabel'] = labelsObj[item.setCat];
  });

  //update qualifiers
  qualifiersCat.forEach(entry => {
    entry.result.forEach(res => {
      if(res.hasOwnProperty('target')){
        res['targetLabel'] = labelsObj[res.target];
      }
      if(res.hasOwnProperty('keywordIRI')){
        res['keywordIRILabel'] = labelsObj[res.keywordIRI];
      }
    });

  });

  //update keyword types
  allTypes.forEach(entry => {
    entry.result.forEach(res => {
      if(res.hasOwnProperty('iri')){
        res['iriLabel'] = labelsObj[res.iri];
      }
      if(res.hasOwnProperty('type')){
        res['typeLabel'] = labelsObj[res.type];
      }
    });
  });

  //update sparql results
  allSparqlResults.forEach(entry => {
    entry.result.forEach(res => {
      if(res.hasOwnProperty('item')){
        res['itemLabel'] = labelsObj[res.item];
      }
    });
  });

  return allTargetLabels;

}
