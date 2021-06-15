import extractTargetKeyword          from './../keyword-target-extraction/extractTargetKeyword' ;

/**
 * group properties of set categories: e.g, some categories have more that one corresponding sparql query
 * input : {setCat: , result: [{sparql : , ...}, {sparql : ..}]}  => output : {setCat: , result: {sparql: [] ..}},
 * + gather some elements (e.g., set category iris) to issue big queries at once using VALUES for example
 * @param     {Array}    result   list of categories with their corresponding properties (format as stated before in input example)
 * @returns   {Object}   containing gathered arrays and the grouped result
 */

export default function groupProperties(result){

  // arrays to : gather all set category iris to ask for corresponding wikipedia pages and their corresponding languages at once
  //            gather all set categories/ list that have a property contains to get qualifiers at once
  let valuesCat = [] , valuesWithContains = [] , valuesWithList = [] , extractedAnnotSparql = []; // valuesTopic = [];

  //group elements in result
  result.forEach(item => {
    if(item.result[0].hasOwnProperty('contains')){
      valuesWithContains.push(item.setCat);
    }

    if(item.result[0].hasOwnProperty('list')){
      item.result.forEach(list => {
        valuesWithList.push(list.list);
      });
    }
    valuesCat.push(item.setCat);

    if(item.result[0].hasOwnProperty('sparql')){
      item.result.forEach( sparql => {
        if(!extractedAnnotSparql.some(elm => elm.sparql == sparql.sparql)){
          extractedAnnotSparql.push(extractTargetKeyword(sparql.sparql));
        }
      });

    }

    let grouped = {};
    item.result.forEach(res => {
      Object.keys(res).forEach(key => {
        if(!grouped.hasOwnProperty(key)){
          grouped[key] = new Set() ;
          grouped[key].add(res[key]) ;
        }else{
          grouped[key].add(res[key]);
        }

      });
    });
    Object.keys(grouped).forEach(id => {
      grouped[id] = [... grouped[id]];
    });
    item.result = grouped ;
    /*
    if(item.result.hasOwnProperty('topics')){
      valuesTopic = [... valuesTopic, ... item.result.topics];
    }*/
  });


  //sort result list
  result.sort((a, b) => (a.setCat > b.setCat) ? 1 : -1);

  return {result: result, valuesCat: valuesCat  , valuesWithContains: valuesWithContains , valuesWithList: valuesWithList , extractedAnnotSparql:extractedAnnotSparql} ; //,valuesTopic:valuesTopic}
}
