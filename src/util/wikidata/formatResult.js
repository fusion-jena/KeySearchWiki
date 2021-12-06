
/**
 * transform endpoint response to cache format id: , result: [{}, {}, ...], if result empty result:[{}]
 * @param     {Array}       resp          response from endpoint
 * @param     {String}      variable      name of key that would be used as key in cache table
 * @param     {Array}       values
 * @returns
 */
function transformToCacheFormat(resp, variable, values){

  let respFormatted = [];
  // check if entry does not have response (if we use OPTIONAL in  all rest of query , we would always find it otherwise we store its result as empty , to have it in cache)
  values.forEach(value => {
    if(!resp.some(item => item[variable] == value)){
      respFormatted.push({[variable]: value , result: [{}]});
    }
  });

  let grouped = {};
  resp.forEach(item => {
    // form result
    let res = {};
    Object.keys(item).forEach(key => {
      if(key != variable){
        res[key] = item[key];
      }
    });
    if(!grouped.hasOwnProperty(item[variable])){
      grouped[item[variable]] = [] ;
      grouped[item[variable]].push(res) ;
    }else{
      grouped[item[variable]].push(res);
    }
  });

  Object.keys(grouped).forEach(id => {
    respFormatted.push({[variable]: id , result: grouped[id]});
  });

  // remove url prefix from iris
  let responseString = JSON.stringify(respFormatted).replace(/http:\/\/www\.wikidata\.org\/entity\//gm, '');

  return JSON.parse(responseString);

}
/**
 *
 * @deprecated
 *
 */
function transformToEndpointFormat(hits, variable){
  let hitsFormatted = [];

  //flatten
  hits.forEach(item => {
    item.result.forEach(res => {
      let element = {[variable] : item[variable]};
      Object.keys(res).forEach(key => {
        element[key] = res[key];
      });
      hitsFormatted.push(element);
    });
  });

  return hitsFormatted ;

}

export{transformToCacheFormat};
