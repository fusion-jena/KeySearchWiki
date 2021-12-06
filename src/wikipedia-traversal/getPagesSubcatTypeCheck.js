import runRequestCatMembers from './../util/wikipedia/runRequestCatMembers';
import runRequestCatID from './../util/wikipedia/runRequestCatID';
import typeCheckWikiPages from './typeCheckWikiPages';
import { logPipelineProgress } from './../util/logger';
const { performance } = require('perf_hooks');

/**
 * given a category title retrieve pages belonging to current category and its all underlying subcategories
 * retrieve corresponding wikidata id for all pages
 * do type check for category members to decide if one should continue going deeper in category hierarchy or stop
 * BFS style
 * @param     {String}            target       iri of target determined from contains property of set category
 * @param     {Function}          request      function to issue (sparql) queries
 * @param     {String}            catTitle     title of initial category
 * @param     {String}            apiurl       apiurl for current language
 * @param     {String}            lang         current language
 * @param     {Object}            subclasses   List of subclasses (direct/indirect) of target/wikimedia internal item, includes also target/wikimedia item itself
 * @returns   {Object}
 */
export default async function getPagesSubcatTypeCheck(target, request, catTitle, apiurl, lang, subclasses) {

  const start = performance.now();

  let relevantSet = [];
  let relevantSetNoType = [];
  let relevantSetNoTargetType = [];
  let catTypeCheckFailed = [];

  //array of current category and all underlying subcategories
  let catsPool = [{ title: catTitle, parents: [] }];
  //categories already visited to detect loops
  let visited = [catTitle];

  //entry to store time of some operation for a picked subcategory
  let statsEntry = {};
  //initialize timers
  let timeMembersAllSubcat = 0, timeWikiIDAllSubcat = 0, typeCheckAllSubcat = 0, typeCheckPostAllSubcat = 0;
  let visitedSubcat = 0, pagesPerLang = 0, subcatPerLang = 0;

  while (catsPool.length > 0) {

    //take a subcategory
    let currentCat = catsPool.pop();

    // more detailed stats not done for all but by demand
    //statsEntry['initialCat'] = catTitle ;
    //statsEntry['cat'] = currentCat.title;
    //statsEntry['lang'] = lang ;

    //console.log('  |  => '+currentCat.title);
    logPipelineProgress.info('  |  => ' + currentCat.title);

    const t0 = performance.now();
    //get subcategory members
    let res = await runRequestCatMembers(lang, currentCat.title, apiurl, 'page|subcat', []);
    const t1 = performance.now();

    //statsEntry['timeMembersSubcat'] = (t1-t0) ;
    timeMembersAllSubcat = timeMembersAllSubcat + (t1 - t0);

    let catmembers = res.result;

    // if api available for current language
    if ( catmembers.length > 0 ){
      //gather category members that are pages (namespace = 0), for those pages we want to do type checking
      let pagesToCheck = [];
      catmembers.forEach(member => {
        // if page
        if (member.ns == 0) {
          pagesToCheck.push(member.pageid);
        }
        if (member.ns == 14) {
          subcatPerLang++;
        }
      });

      let typeCheck = true;
      //statsEntry['timeWikiIDSubcat'] = 0 ;
      //statsEntry['typeCheckSubcat'] =  0 ;
      //statsEntry['typeCheckPostSubcat'] =  0 ;
      //statsEntry['pagesToCheck'] = pagesToCheck.length ;

      pagesPerLang = pagesPerLang + pagesToCheck.length;

      // if pages exist
      if (pagesToCheck.length > 0) {

        visitedSubcat++;

        const t2 = performance.now();
        let wikidataIDs = await runRequestCatID(pagesToCheck, apiurl, lang );
        const t3 = performance.now();

        //statsEntry['timeWikiIDSubcat'] = (t3-t2) ;

        timeWikiIDAllSubcat = timeWikiIDAllSubcat + (t3 - t2);

        let wikidataIRISet = new Set();

        wikidataIDs.forEach(item => {
          if(item.result != ''){
            wikidataIRISet.add(item.result);
          }
        });

        let irisArray = [...wikidataIRISet];

        const t4 = performance.now();
        let result = await typeCheckWikiPages(request, target, irisArray, typeCheck, currentCat, lang, statsEntry, subclasses);
        const t5 = performance.now();

        typeCheckAllSubcat = typeCheckAllSubcat + statsEntry.typeCheckSubcat;
        typeCheckPostAllSubcat = typeCheckPostAllSubcat + statsEntry.typeCheckPostSubcat;

        relevantSet = relevantSet.concat(result.relevantSet);
        relevantSetNoType = relevantSetNoType.concat(result.relevantSetNoType);
        relevantSetNoTargetType = relevantSetNoTargetType.concat(result.relevantSetNoTargetType);

        if (result.catTypeCheckFailed != undefined) {
          catTypeCheckFailed.push(result.catTypeCheckFailed);
        }

        if (result.typeCheck) {

          catmembers.forEach(member => {
            //if subcategory
            if (member.ns == 14) {
              //to avoid loops
              if (!visited.some(item => item == member.title)) {
                visited.push(member.title);
                let newparents = [...currentCat.parents];
                newparents.push(currentCat.title);
                catsPool.push({ title: member.title, parents: newparents });
              }
            }
          });

        }
      }


      // if no pages in the category , add subcategories
      else {

        catmembers.forEach(member => {
          //if subcategory
          if (member.ns == 14) {
            //to avoid loops
            if (!visited.some(item => item == member.title)) {
              visited.push(member.title);
              let newparents = [...currentCat.parents];
              newparents.push(currentCat.title);
              catsPool.push({ title: member.title, parents: newparents });
            }
          }
        });
      }
    }
  }

  const end = performance.now();


  //console.log(`  |  DONE ! lang: ${lang} , #cats-typechecked: ${visitedSubcat}`)
  logPipelineProgress.info(`  |  DONE ! lang: ${lang} , #cats-typechecked: ${visitedSubcat}`);

  let timeTraversalOneLang = {
    lang: lang, typeCheckedSubcats: visitedSubcat, pagesPerLang: pagesPerLang, subcatPerLang: subcatPerLang,
    totalTime: (end - start),
    timeMembersAllSubcat: timeMembersAllSubcat, timeWikiIDAllSubcat: timeWikiIDAllSubcat,
    typeCheckAllSubcat: typeCheckAllSubcat, typeCheckPostAllSubcat: typeCheckPostAllSubcat,
    noCacheCall: (end - start) - timeMembersAllSubcat - timeWikiIDAllSubcat - typeCheckAllSubcat
  };

  return {
    relevantSet: relevantSet,
    relevantSetNoType: relevantSetNoType,
    relevantSetNoTargetType: relevantSetNoTargetType,
    catTypeCheckFailed: catTypeCheckFailed,
    timeTraversalOneLang: timeTraversalOneLang
  };
}
