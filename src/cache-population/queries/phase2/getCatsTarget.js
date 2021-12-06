import Cache   from './../../../util/cache';

/**
 * return list of categories together with their corresponding target
 * exclude categories with multi-target or without target
 *
 *
 *
 */

export default function getCatsTarget(){

  console.log('Get list of category => target . . .');

  //setup cache
  const cache = new Cache( 'Categories', 'setCat' );

  //get all content
  let resp = cache.getAll();

  //add categories with multi-target or without target
  let exclude = new Set();

  //key value to store the target for each category
  let catToTarget = {};

  resp.forEach(item => {
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

    if(!grouped.hasOwnProperty('contains')){
      exclude.add(item.setCat);
    }
    else{
      if(grouped.contains.length > 1){
        exclude.add(item.setCat);
      }
      else{
        catToTarget[item.setCat] = grouped.contains[0];
      }
    }

  });

  return {exclude: exclude, catToTarget:catToTarget};
}
