
/**
 * get target and keyword annotations from "category contains" or ""is a list of""
 * annotate from its value and qualifiers (if available)
 * in case of countains containing multiple values having same target , keep one target and do distinct union of keywords
 * @param     {Function}          request   function to issue (sparql) queries
 * @param     {Object}            qualif    object containing qualifiers
 * @param     {Array}             allTypes  array of keywords and their types
 * @param     {String}            source    list or set-category
 * @returns   {Array}             array with annotations
 */
export default function getAnnotPage(request, qualif , allTypes, source) {

  // group by target
  let annotations = [];
  qualif.result.forEach(qual => {
    if(!annotations.some(target => target.target == qual.target)){
      if(qual.hasOwnProperty('keywordIRI')){
        annotations.push({target: qual.target , targetLabel: qual.targetLabel, keywords:[{iri:qual.keywordIRI, label: qual.keywordIRILabel, isiri: qual.isiri , types:[]}]});
      }
      else{
        annotations.push({target: qual.target , targetLabel: qual.targetLabel, keywords:[]});
      }
    }
    else {
      let index = annotations.findIndex(element => element.target == qual.target);
      if(!annotations[index].keywords.some(keyword => keyword.iri == qual.keywordIRI) && qual.hasOwnProperty('keywordIRI')){
        annotations[index].keywords.push({iri:qual.keywordIRI, label: qual.keywordIRILabel, isiri: qual.isiri, types:[]});
      }
    }
  });

  //fill in keyword types in annotations
  annotations.forEach(annot => {
    annot.keywords.forEach(keyword => {
      //some qualifier values are numbers
      keyword.iri = keyword.iri.toString();
      let types = allTypes.find(element => element.iri == keyword.iri);
      types.result.forEach(res => {
        if(res.hasOwnProperty('type')){
          keyword.types.push({type: res.type, typeLabel: res.typeLabel});
        }
      });
    });
  });

  return annotations;

}
