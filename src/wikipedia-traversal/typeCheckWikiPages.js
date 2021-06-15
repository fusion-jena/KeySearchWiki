import getTypesSubclass         from './../queries/getTypesSubclass';
import { logPipelineProgress }  from './../util/logger';
const { performance } = require('perf_hooks');
/**
 * check percentage of subcategory members that have the target type/ target is in its subclass hierarchy , to decide if one should continue going deeper in category hierarchy or stop
 * @param     {Function}          request      function to issue (sparql) queries
 * @param     {String}            target       iri of target determined from contains property of set category
 * @param     {Array}             pages        list of pages iris to check type for
 * @param     {Boolean}           typeCheck    boolean to report about type check , : the majority from target = true , false otherwise
 * @param     {Object}            currentCat   object containing current category title and its parents categories
 * @param     {String}            lang         current language
 * @param     {Object}            statsEntry   object where to add statistics
 * @returns   {Object}
 */
export default async function typeCheckWikiPages(request, target, pages, typeCheck, currentCat, lang, statsEntry) {

  const relevantSet = [];
  const relevantSetNoType = [];
  const relevantSetNoTargetType = [];
  const relevantSetWikimediaType = [];
  let catTypeCheckFailed;

  const pagesWikiID = pages.map(item => `http://www.wikidata.org/entity/${item}`);

  const t4 = performance.now();
  const irisAll = await getTypesSubclass(pagesWikiID, request);
  const t5 = performance.now();

  statsEntry['typeCheckSubcat'] = (t5 - t4);

  const t6 = performance.now();

  // pick uris without type
  const irisWithoutType = new Set(
    irisAll.filter(item => !item.result[0].hasOwnProperty('type'))
      .map( (item) => item.page )
  );
  // pick URIs that are descendants of "Wikimedia internal item (Q17442446)"
  const irisWikimediaType = new Set(
    irisAll.filter(item => item.result.some( (el) => el.type == 'http://www.wikidata.org/entity/Q17442446' ))
      .map( (item) => item.page )
  );

  // filter uris without type from initial array of wikidata uris
  // we are just concerned with actual pages (and not lists etc) that have a type
  let irisArraywithType = pagesWikiID.filter(item => !irisWithoutType.has(item) && !irisWikimediaType.has(item) );

  if (irisArraywithType.length != 0) {
    //filter the ones that have target type in their subclass hierarchy
    let irisOfTarget = irisAll.filter(item => item.result.some(element => element.type == target));

    let irisOfTargetDistinct = [... new Set(irisOfTarget.map(item => item.page))];

    // if fraction of entities of target type or in subclass hierarchy < to a certain value , do not add underlying subcategories to exploration array
    // add only entities that are of target type or in subclass hierarchy
    irisOfTargetDistinct.forEach(iri => {
      relevantSet.push({ iri: iri, source: [{ cat: currentCat.title, lang: lang }] });
    });

    // fraction of pages in this category that match the target type (or one of its subtypes)
    const fractionOfType = irisArraywithType.length == 0
      ? 0
      : (irisOfTargetDistinct.length / irisArraywithType.length);

    //console.log('  |  fraction: ' + fractionOfType);
    logPipelineProgress.info('  |  fraction: ' + fractionOfType);

    if (fractionOfType < 0.5) {

      typeCheck = false;
      catTypeCheckFailed = { lang: lang, fractionOfType: fractionOfType, stopAtCat: currentCat.title, parents: currentCat.parents, depth: currentCat.parents.length };

    } else {

      //if target check passes, store also members with no type or no target type/subclass of type
      relevantSetNoType.push(
        ... [ ... irisWithoutType ].map( (iri) => ({ iri: iri, source: [{ cat: currentCat.title, lang: lang }] }) )
      );

      // members no target type/subclass of type allirisdistinct - ones with target type
      let irisNoTarget = pagesWikiID
        .filter(x => !irisOfTargetDistinct.includes(x))
        .filter(x => !irisWithoutType.has(x));

      irisNoTarget.forEach(iri => {
        relevantSetNoTargetType.push({ iri: iri, source: [{ cat: currentCat.title, lang: lang }] });
      });

      // store wikimedia typed pages as well
      relevantSetWikimediaType.push(
        ... [ ... irisWikimediaType ].map( (iri) => ({ iri: iri, source: [{ cat: currentCat.title, lang: lang }] }) )
      );
    }

  }


  if (typeCheck) {
    logPipelineProgress.info('  |  type check succeeded !');
  } else {
    logPipelineProgress.info('  |  type check failed !');
  }
  const t7 = performance.now();

  statsEntry['typeCheckPostSubcat'] = (t7 - t6);

  return {
    typeCheck:                typeCheck,
    relevantSet:              relevantSet,
    relevantSetNoType:        relevantSetNoType,
    relevantSetNoTargetType:  relevantSetNoTargetType,
    relevantSetWikimediaType: relevantSetWikimediaType,
    catTypeCheckFailed:       catTypeCheckFailed
  };
}
