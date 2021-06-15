

/**
 * gather all keywords from qualifiers list / gather all sparql targets
 *
 *
 * @param     {Array}    qualifiersCat          "contains" qualifier values for set categories
 * @param     {Array}    qualifiersList         "contains" qualifier values for lists corresponding to set categories
 * @param     {Array}    extractedAnnotSparql    sparql queries corresponding to all set categories
 * @returns   {Object}   contains arrays of each of the gathered elements
 */

export default function gatherElements(qualifiersCat, qualifiersList, extractedAnnotSparql){

  // gather all keywords
  let allKeywordIRIs = [];
  //get all targets labels for sparql query annotation
  let allSparqlTargets = [];

  qualifiersCat.forEach(qual => {
    qual.result.forEach(res => {
      if(res.hasOwnProperty('keywordIRI')){
        allKeywordIRIs.push(res.keywordIRI.toString());
      }
    });
  });

  qualifiersList.forEach(qual => {
    qual.result.forEach(res => {
      if(res.hasOwnProperty('keywordIRI')){
        allKeywordIRIs.push(res.keywordIRI.toString());
      }
    });
  });

  extractedAnnotSparql.forEach(ex => {
    ex.keywords.forEach(keyword => {
      allKeywordIRIs.push(keyword);
    });
    allSparqlTargets.push(ex.target);
  });


  return {allKeywordIRIs: allKeywordIRIs, allSparqlTargets: allSparqlTargets} ;
}
