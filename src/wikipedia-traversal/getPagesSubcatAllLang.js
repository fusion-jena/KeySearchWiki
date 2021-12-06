import getLabel                                             from './../queries/getLabel' ;
import getPagesSubcatTypeCheck                              from './getPagesSubcatTypeCheck';
import {logPipelineProgress}                                from './../util/logger';
const { performance } = require('perf_hooks');
/**
 * for each category retrieve all its member pages going through the subcategory hierarchy
 * take distinct set from all languages
 * @param     {String}            target       iri of target determined from contains property of set category
 * @param     {String}            catIRI       iri of the initial input category
 * @param     {Object}            titleLang    corresponding list of titles and languages corresponding to actual category
 * @param     {Function}          request      function to issue (sparql) queries
 * @param     {Object}            subclasses   List of subclasses (direct/indirect) of target/wikimedia internal item, includes also target/wikimedia item itself
 */
export default async function getPagesSubcatAllLang(target , catIRI, titleLang , request, subclasses) {

  // set for relevant results with type in subclass hierarchy of target
  let relevantSetMap = new Map(), withType = [] ;
  // set for found relevant results found as members in wikipedia cat pages but that have no type in wikidata
  let relevantSetNoTypeMap = new Map(), noType = [];
  // set for found relevant results found as members in wikipedia cat pages but their type is not in the target subclass hierarchy
  let relevantSetNoTargetTypeMap = new Map() , noTargetType = [] ;
  //categories where we stopped exploring their hierarchy
  let catTypeCheckFailed = [] ;
  // initiate timers for
  let typeCheckT = 0 ,  typeCheckPostT= 0 , tlabel3 = 0, tlabel4 = 0, tlabel5 = 0, tlabel6 = 0 , tlabel7 = 0, tlabel8 = 0 ;
  //store detailled traversal times for each language
  let timeTraversalLangs = [];

  //console.log('retrieve category/subcategory members and their wikidata id');
  logPipelineProgress.info('retrieve category/subcategory members and their wikidata id');

  const traversalAllLang0= performance.now();

  for (let i = 0; i < titleLang.length; i++) {

    // get category members from wikipedia for all languages
    let lang = titleLang[i].lang ,
        apiurl = `https://${lang}.wikipedia.org/w/api.php`;

    //console.log('lang: ' + lang);
    logPipelineProgress.info('lang: ' + lang);

    const tc0= performance.now();
    let resultForLang = await getPagesSubcatTypeCheck(target, request, titleLang[i].title, apiurl, lang, subclasses);
    const tc1= performance.now();

    typeCheckT = typeCheckT + (tc1 - tc0);

    const tcPost0= performance.now();

    if(resultForLang.relevantSet.length + resultForLang.relevantSetNoType.length + resultForLang.relevantSetNoTargetType.length != 0){
      timeTraversalLangs.push(resultForLang.timeTraversalOneLang);
    }
    else {
      continue;
    }

    resultForLang.relevantSet.forEach(item => {
      if(!relevantSetMap.has(item.iri)){
        relevantSetMap.set(item.iri, item.source);
      }
      else{
        relevantSetMap.get(item.iri).push(item.source[0]);
      }
      /*let index = relevantSet.findIndex(el => item.iri == el.iri);
      if(index == -1){
        relevantSet.push({ ... item});
      }
      else{
        let newsource = [...relevantSet[index].source] ;
        newsource.push(item.source[0]);
        relevantSet[index].source = newsource ;
      }*/
    });

    resultForLang.relevantSetNoType.forEach(item => {
      if(!relevantSetNoTypeMap.has(item.iri)){
        relevantSetNoTypeMap.set(item.iri, item.source);
      }
      else{
        relevantSetNoTypeMap.get(item.iri).push(item.source[0]);
      }
      /*let index = relevantSetNoType.findIndex(el => item.iri == el.iri);
      if(index == -1){
        relevantSetNoType.push({ ... item});
      }
      else{
        let newsource = [...relevantSetNoType[index].source] ;
        newsource.push(item.source[0]);
        relevantSetNoType[index].source = newsource ;
      }*/
    });

    resultForLang.relevantSetNoTargetType.forEach(item => {
      if(!relevantSetNoTargetTypeMap.has(item.iri)){
        relevantSetNoTargetTypeMap.set(item.iri, item.source);
      }
      else{
        relevantSetNoTargetTypeMap.get(item.iri).push(item.source[0]);
      }
      /*let index = relevantSetNoTargetType.findIndex(el => item.iri == el.iri);
      if(index == -1){
        relevantSetNoTargetType.push({ ... item});
      }
      else{
        let newsource = [...relevantSetNoTargetType[index].source] ;
        newsource.push(item.source[0]);
        relevantSetNoTargetType[index].source = newsource ;
      }*/
    });

    catTypeCheckFailed = [... catTypeCheckFailed , ...resultForLang.catTypeCheckFailed ] ;

    const tcPost1= performance.now();

    typeCheckPostT = typeCheckPostT + (tcPost1 - tcPost0);

  }
  const traversalAllLang1= performance.now();

  //console.log(`
  //  Time Category traversal : ${(traversalAllLang1 - traversalAllLang0)/1000} s`);
  logPipelineProgress.info(`Time Category traversal : ${(traversalAllLang1 - traversalAllLang0)/1000} s`);
  //console.log(`
  //  Time type check : ${typeCheckT/1000} s`);
  logPipelineProgress.info(`Time type check : ${typeCheckT/1000} s`);
  //console.log(`
  //  Time type check post-proc : ${typeCheckPostT/1000} s`);
  logPipelineProgress.info(`Time type check post-proc : ${typeCheckPostT/1000} s`);

  //console.log('retrieve labels for wikidata ids');
  logPipelineProgress.info('retrieve labels for wikidata ids');

  const getLabelsAll0= performance.now();

  if(relevantSetMap.size != 0){
    let relevantSetValues = [... relevantSetMap.keys()];
    tlabel3= performance.now();
    let labelsWithType = await getLabel(relevantSetValues, request);
    tlabel4= performance.now();
    // append source and lang info
    withType = labelsWithType.map(rel => {
      let obj = {
        iri:rel.iri,
        iriLabel: rel.result[0].iriLabel ,
        source: [... relevantSetMap.get(rel.iri)]
      };
      return obj ;
    });
  }


  /*if(relevantSet.length != 0){
  let relevantSetValues = relevantSet.map(item => item = item.iri);
  tlabel3= performance.now();
  withType = await getLabel(relevantSetValues, request);
  tlabel4= performance.now();
  // append source and lang info
  withType.forEach(rel => {
    let entity = relevantSet.find(item => item.iri == rel.iri);
    rel["iriLabel"] = rel.result[0].iriLabel ;
    rel["source"] = [... entity.source] ;
    delete rel.result ;
  });
}*/

  if(relevantSetNoTypeMap.size != 0){
    let relevantSetNoTypeValues = [... relevantSetNoTypeMap.keys()];
    tlabel5= performance.now();
    let labelsNoType = await getLabel(relevantSetNoTypeValues, request);
    tlabel6= performance.now();
    // append source and lang info
    noType = labelsNoType.map(rel => {
      let obj = {
        iri:rel.iri,
        iriLabel: rel.result[0].iriLabel ,
        source: [... relevantSetNoTypeMap.get(rel.iri)]
      };
      return obj ;
    });
  }

  /*if(relevantSetNoType.length != 0){
  let relevantSetNoTypeValues = relevantSetNoType.map(item => item = item.iri);
  tlabel5= performance.now();
  noType = await getLabel(relevantSetNoTypeValues, request);
  tlabel6= performance.now();
  noType.forEach(rel => {
    let entity = relevantSetNoType.find(item => item.iri == rel.iri);
    rel["iriLabel"] = rel.result[0].iriLabel ;
    rel["source"] = [... entity.source] ;
    delete rel.result ;
  });
}*/

  if(relevantSetNoTargetTypeMap.size != 0){
    let relevantSetNoTargetTypeValues = [... relevantSetNoTargetTypeMap.keys()];
    tlabel7= performance.now();
    let labelsNoTargetType = await getLabel(relevantSetNoTargetTypeValues, request);
    tlabel8= performance.now();
    // append source and lang info
    noTargetType = labelsNoTargetType.map(rel => {
      let obj = {
        iri:rel.iri,
        iriLabel: rel.result[0].iriLabel ,
        source: [... relevantSetNoTargetTypeMap.get(rel.iri)]
      };
      return obj ;
    });
  }

  /*if(relevantSetNoTargetType.length != 0){
  let relevantSetNoTargetTypeValues = relevantSetNoTargetType.map(item => item = item.iri);
  tlabel7= performance.now();
  noTargetType = await getLabel(relevantSetNoTargetTypeValues, request);
  tlabel8= performance.now();
  noTargetType.forEach(rel => {
    let entity = relevantSetNoTargetType.find(item => item.iri == rel.iri);
    rel["iriLabel"] = rel.result[0].iriLabel ;
    rel["source"] = [... entity.source] ;
    delete rel.result ;
  });
}*/

  const getLabelsAll1 = performance.now();

  //console.log(`
  //  Time taken get all labels (cache calls + post-proc) : ${(getLabelsAll1 - getLabelsAll0)/1000} s`);
  logPipelineProgress.info(`Time taken get all labels (cache calls + post-proc) : ${(getLabelsAll1 - getLabelsAll0)/1000} s`);

  let labelCache = (tlabel4-tlabel3)+(tlabel6-tlabel5)+(tlabel8-tlabel7);
  //console.log(`
  //  Time Taken label cache calls : ${labelCache/1000} s`);
  logPipelineProgress.info(`Time Taken label cache calls : ${labelCache/1000} s`);

  let labelPost = (getLabelsAll1 - getLabelsAll0) - labelCache ;
  //console.log(`
  //  Time Taken label post-proc : ${labelPost/1000} s`);
  logPipelineProgress.info(`Time Taken label post-proc : ${labelPost/1000} s`);


  let timeWikiTraversal = {
    timeTraversal: (traversalAllLang1 - traversalAllLang0), timeTypeCheck: typeCheckT, timeTypeCheckPost: typeCheckPostT,
    timeLabels: (getLabelsAll1 - getLabelsAll0), timeLabelCache: labelCache, timeLabelPost: labelPost ,
    allIrisSize: relevantSetMap.size + relevantSetNoTypeMap.size + relevantSetNoTargetTypeMap.size,
    irisSizeType: relevantSetMap.size , timeLabelCacheType: (tlabel4-tlabel3),
    irisSizenoType: relevantSetNoTypeMap.size, timeLabelCacheNoType:(tlabel6-tlabel5) ,
    irisSizenoTargetType: relevantSetNoTargetTypeMap.size, timeLabelCacheNoTargetType:(tlabel8-tlabel7),
    timeTraversalPerLang: timeTraversalLangs};

  return {relevantSet: withType, relevantSetNoType: noType, relevantSetNoTargetType: noTargetType , catTypeCheckFailed:catTypeCheckFailed , timeWikiTraversal:timeWikiTraversal} ;

}
