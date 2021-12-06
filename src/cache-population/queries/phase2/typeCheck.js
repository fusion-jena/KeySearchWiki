import Cache   from './../../../util/cache';

/**
 * having a list of iris and a target
 * check percentage of subcategory members that have the target type/ target is in its subclass hierarchy , to decide if one should continue going deeper in category hierarchy or stop
 * @param     {String}            target       iri of category target
 * @param     {Array}             iris         list wikidata iris to check type for
 *
 */

export default function typeCheck(target, iris){

  //setup cache
  const cache = new Cache( 'memberTargets', 'e' );

  //get all content
  let resp = cache.getValues(iris);

  let irisOfTarget = new Set();
  let irisWikimediaType = new Set();

  resp.hits.forEach(item => {
    if(item.result.some(elem => elem == target) && !item.result.some(elem => elem == 'Q17442446')){
      irisOfTarget.add(item.e);
    }
    if(item.result.some(elem => elem == 'Q17442446')){
      irisWikimediaType.add(item.e);
    }
  });

  let entities = (iris.length - [... irisWikimediaType].length);

  if(entities != 0){

    let fraction = [...irisOfTarget].length / entities;

    if(fraction < 0.5){
      return {bool:false, fraction:fraction};
    }
    else{
      return {bool:true, fraction:fraction};
    }
  }
  if(entities == 0){
    return {bool:false, fraction:0};
  }

}
