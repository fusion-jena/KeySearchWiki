import Config                   from './../../config/config';
import _                        from 'lodash';

/**
 * generate intersection of relevant entities of queries array
 *
 * @param    {Array}     queryArray     array of query iris :[queryIRI1, queryIRI2, ...]
 * @param    {String}    target         target of queries in set
 * @returns  {Object}
 */

export default function generateIntersection(queryArray,entriesMap){

  let intersect = [];

  //console.log(queryArray);

  let labels = new Map();

  queryArray.forEach((queryID, i) => {
    //find query in Map
    let entry = entriesMap.get(queryID);
    entry.forEach(item => {
      labels.set(item.iri, item);
    });
    let relevant = entry.map(element => element.iri);
    if(i==0){
      intersect = relevant ;
    }
    else{
      intersect = _.intersection(intersect, relevant);
    }
  });

  //console.log('final intersect: '+ intersect.length);

  let intersectJSON = intersect.map(element => labels.get(element));

  return {intersect: intersectJSON, intersectSize: intersectJSON.length};
}
