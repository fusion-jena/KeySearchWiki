import getSetCategories           from './../queries/getSetCategories';
import getCatMembersDBpedia       from './../queries/getCatMembersDBpedia';
import getWikiTitleLang           from './../queries/getWikiTitleLang';
import getQualifiers              from './../queries/getQualifiers';
import getAllSparqlResult         from './../queries/getAllSparqlResult';
import getKeywordType             from './../queries/getKeywordType';
import getLabel                   from './../queries/getLabel';
import getAnnotSparql             from './../keyword-target-extraction/getAnnotSparql';
import getAnnotPage               from './../keyword-target-extraction/getAnnotPage';
import getPagesSubcatAllLang      from './../wikipedia-traversal/getPagesSubcatAllLang';
import groupProperties            from './groupProperties';
import gatherElements             from './gatherElements';
import streamEntryWrite           from './streamEntryWrite';
import Config                     from './../config/config';
import { logPipelineProgress }    from './../util/logger';
import progressBar                from 'cli-progress';

const { performance } = require('perf_hooks');


/**
 * actual pipeline for generating candidates from set categories
 * @param     {Object}      fs        object for file system node module
 * @param     {Function}    request   function to issue (sparql) queries
 * ideas :
 * @todo for set categories without target , predict target using the first list of pages that appear in wikipedia (e.g., using LCS) also for all compare type predicted with the one defined from the properties previously.
 * @todo for case of no annotations existing try with NLP tool for entity linking from set category label (e.g., DBpedia spotlight ? Falcon (test with category page label annotates as a whole category, no separate annotation of query elements))
 */

export default async function generateCandidate(fs, request) {

  const barWikiTraversal = new progressBar.SingleBar({}, progressBar.Presets.shades_classic);

  const start = performance.now();

  let logStreamGS = fs.createWriteStream(Config.rawData, { flags: 'a' });
  logStreamGS.write('[');
  logStreamGS.write('\r\n');

  let logStreamStat = fs.createWriteStream(Config.statsRawData, { flags: 'a' });
  logStreamStat.write('[');

  let timetraversal = fs.createWriteStream(Config.outputGS + 'time-traversal.json', { flags: 'a' });
  timetraversal.write('[');
  let noApiForLang = [], invalidTitle = [];

  //file where to store languages with no api
  let file_no_api_lang = Config.outputGS + 'no-api-for-lang.json';

  //init all timestamps
  let tAnnotSparql0 = 0, tAnnotSparql1 = 0, tAnnotPageCat0 = 0, tAnnotPageCat1 = 0, tAnnotPageList0 = 0, tAnnotPageList1 = 0, tExecSparql0 = 0, tExecSparql1 = 0, tExecWikip0 = 0, tExecWikip1 = 0, tExecDBp0 = 0, tExecDBp1 = 0;

  console.log('Retrieve set categories with some properties');
  logPipelineProgress.info('Retrieve set categories with some properties');

  //retrieve set categories with some properties
  const tAllCat0 = performance.now();
  let result = await getSetCategories(request);
  const tAllCat1 = performance.now();

  console.log('Group properties of set categories');
  logPipelineProgress.info('Group properties of set categories');

  let grouped = groupProperties(result);

  result = result.slice(Config.checkpoint - 1);

  // UNCOMMENT THE FOLLOWING PART IF YOU WANT TO RUN THE PIPELINE FOR JUST ONE SET CATEGORY
  // CHANGE THE CATEGORY IRI ACCORDINGLY IN THE FOLLOWING LINE
  /*
  result = result.filter(elm => elm.setCat == 'http://www.wikidata.org/entity/Q7710106');
  console.log(result);
  */

  console.group('Retrieve all data that can be fetched at once for now');
  logPipelineProgress.info('Retrieve all data that can be fetched at once for now');

  console.log('fetch title/lang for all set categories');
  logPipelineProgress.info('fetch title/lang for all set categories');

  const tAllTitleLangs0 = performance.now();
  let wikipTitleLang = await getWikiTitleLang(grouped.valuesCat, request);
  const tAllTitleLangs1 = performance.now();

  console.log('fetch all qualifiers for contains values for set categories');
  logPipelineProgress.info('fetch all qualifiers for contains values for set categories');

  const tQualifCat0 = performance.now();
  let qualifiersCat = await getQualifiers(grouped.valuesWithContains, request, 'set-category');
  const tQualifCat1 = performance.now();

  console.log('fetch all qualifiers for lists corresponding to set categories');
  logPipelineProgress.info('fetch all qualifiers for lists corresponding to set categories');

  const tQualifList0 = performance.now();
  let qualifiersList = await getQualifiers(grouped.valuesWithList, request, 'list');
  const tQualifList1 = performance.now();

  console.log('gather all keywords and sparql targets');
  logPipelineProgress.info('gather all keywords and sparql targets');

  let gathered = gatherElements(qualifiersCat, qualifiersList, grouped.extractedAnnotSparql);

  console.log('fetch all keyword types');
  logPipelineProgress.info('fetch all keyword types');
  //get keyword types
  const tAllKeyType0 = performance.now();
  const allTypes = await getKeywordType(gathered.allKeywordIRIs, request);
  const tAllKeyType1 = performance.now();

  console.log('fetch all sparql target labels');
  logPipelineProgress.info('fetch all sparql target labels');
  //get sparql targets labels
  const tAllTargetLabel0 = performance.now();
  const allTargetLabels = await getLabel(gathered.allSparqlTargets, request);
  const tAllTargetLabel1 = performance.now();

  console.log('execute all sparql queries corresponding to all set categories');
  logPipelineProgress.info('excute all sparql queries corresponding to all set categories');
  // get results of all sparql queries corresponding to set categories
  const tAllSparql0 = performance.now();
  let allSparqlResults = await getAllSparqlResult(request, grouped.extractedAnnotSparql);
  const tAllSparql1 = performance.now();

  console.groupEnd();

  console.log('For each set categories extract annotations and retrieve relevant results');
  logPipelineProgress.info('For each set categories extract annotations and retrieve relevant results');
  // for each category extract annotations

  barWikiTraversal.start(result.length, 0);

  for (let i = 0; i < result.length; i++) {

    const timeTreatOneCat0 = performance.now();

    //console.group(`--- ${i+1}. ${result[i].result.setCatLabel} ---`);
    logPipelineProgress.info(`--- ${i + 1}. ${result[i].result.setCatLabel} ---`);

    let entry = { queryID: result[i].setCat, query: result[i].result.setCatLabel[0], sparql: '', contains: '', list: '', relevant: { sparql: [], DBpedia: [], wikipedia: [] }, comment: '' };

    // if sparql query exists annotate from query
    if (result[i].result.hasOwnProperty('sparql')) {

      //console.log('sparql query exists , annotate from it');
      logPipelineProgress.info('sparql query exists , annotate from it');

      let sparqlAnnot = [];
      tAnnotSparql0 = performance.now();
      for (let k = 0; k < result[i].result.sparql.length; k++) {
        let sparql = grouped.extractedAnnotSparql.find(el => el.sparql == result[i].result.sparql[k]);
        let annotationSparql = getAnnotSparql(sparql, allTargetLabels, allTypes);
        sparqlAnnot.push(annotationSparql);
      }
      tAnnotSparql1 = performance.now();
      entry.sparql = sparqlAnnot;
    }

    //if property P4224 "category contains" exists , annotate from its value and qualifiers (if available)
    if (result[i].result.hasOwnProperty('contains')) {

      //console.log('"category contains" exists , annotate from it');
      logPipelineProgress.info('"category contains" exists , annotate from it');

      // get category contains qualifiers
      let qualif = qualifiersCat.find(item => item.iri == result[i].setCat);
      tAnnotPageCat0 = performance.now();
      let annotationContains = getAnnotPage(request, qualif, allTypes, 'set-category');
      tAnnotPageCat1 = performance.now();

      entry.contains = annotationContains;

    }

    //if corresponding list exists , annotate from "is a list of" P360 and qualifiers (if available)
    if (result[i].result.hasOwnProperty('list')) {

      //console.log('list exists , annotate from it');
      logPipelineProgress.info('list exists , annotate from it');

      let listAnnot = [];
      tAnnotPageList0 = performance.now();
      for (let k = 0; k < result[i].result.list.length; k++) {
        let qualif = qualifiersList.find(item => item.iri == result[i].result.list[k]);
        if (Object.keys(qualif.result[0]).length == 0) {
          listAnnot.push({ list: result[i].result.list[k], annotations: [] });
        }
        else {
          let annotationList = getAnnotPage(request, qualif, allTypes, 'list');
          listAnnot.push({ list: result[i].result.list[k], annotations: annotationList });
        }
      }
      tAnnotPageList1 = performance.now();

      entry.list = listAnnot;
    }

    if (!result[i].result.hasOwnProperty('sparql') && !result[i].result.hasOwnProperty('contains') && !result[i].result.hasOwnProperty('list')) {
      //console.log('no annotation source available');
      logPipelineProgress.info('no annotation source available');
      entry.comment = 'no annotation source available';
    }

    // retrieve list of relevant results
    //get from sparql
    if (entry.sparql != '') {

      //console.log('retrieve list of relevant results : SPARQL');
      logPipelineProgress.info('retrieve list of relevant results : SPARQL');

      let relevant = [];

      tExecSparql0 = performance.now();
      entry.sparql.forEach(annot => {
        let idQuery = annot.sparqlQuery.replace(/[^A-Z0-9]/ig, '');
        let result = allSparqlResults.find(item => item.query == idQuery);
        if (Object.keys(result.result[0]).length == 0) {
          relevant.push({ query: annot.sparqlQuery, result: [] });
        }
        else {
          relevant.push({ query: annot.sparqlQuery, result: result.result });
        }
      });
      tExecSparql1 = performance.now();

      entry.relevant.sparql = relevant ;
    }

    //console.log('retrieve list of relevant results : DBpedia');
    logPipelineProgress.info('retrieve list of relevant results : DBpedia');
    // REMARK: till now remarked that all queries (for current set cats) that attempt to retrieve relevant results from dbpedia give empty result (missing mapping between DBpedia and wikidata)
    // estimated time to run dbpedia members retrieval queries for all set Cats ~9hours (that most probably at the end waste without finding any result over whole pipeline)

    //get category members from DBpedia (not all DBpedia category pages have link to wikidata category, because of language)
    // DBpedia public endpoint is english version and some categories retrieved from wikidata do not have corresponding english wikipedia page and therefore does not exist
    tExecDBp0 = performance.now();
    let rel = await getCatMembersDBpedia([result[i].setCat], request);
    tExecDBp1 = performance.now();

    //check if result is empty (using OPTIONAL in queries with VALUES , keeps the ids also in case of no result which results in having , {id: , result:[{}]})
    if (!Object.keys(rel[0].result[0]).length == 0) {
      entry.relevant.DBpedia = rel;
    }

    let timeWikiPerTarget = [];

    //get category members from wikipedia (type check)
    if (entry.contains != '' && entry.contains.length > 0) {

      //console.group('retrieve list of relevant results : Wikipedia');
      logPipelineProgress.info('retrieve list of relevant results : Wikipedia');

      tExecWikip0 = performance.now();
      for (let j = 0; j < entry.contains.length; j++) {

        const tTraversalTarget0 = performance.now();

        //console.log('retrieve category title and language');
        logPipelineProgress.info('retrieve category title and language');

        // find title and language of corresponding wikipedia category page
        let found = wikipTitleLang.find(cat => cat.catIRI == result[i].setCat);
        //filter elements without both title and length
        let titleLang = found.result.filter(item => item.hasOwnProperty('title') && item.hasOwnProperty('lang'));
        if (titleLang.length != 0) {
          let target = entry.contains[j].target;
          //console.log(target);
          logPipelineProgress.info(target);

          let relevantWikip = await getPagesSubcatAllLang(target, result[i].setCat, titleLang, request);

          entry.relevant.wikipedia.push({
            target: target,
            targetType:         relevantWikip.relevantSet,
            noType:             relevantWikip.relevantSetNoType,
            noTargetType:       relevantWikip.relevantSetNoTargetType,
            noWikidataID:       relevantWikip.membersNoWikidataItem,
            catTypeCheckFailed: relevantWikip.catTypeCheckFailed
          });
          noApiForLang = [...noApiForLang, ...relevantWikip.noApiForLang];
          invalidTitle = [...invalidTitle, ...relevantWikip.invalidTitle];

          const tTraversalTarget1 = performance.now();

          timeWikiPerTarget.push({ catIRI: result[i].setCat, catLabel: result[i].result.setCatLabel[0], target: target, timeWikiTraversal: relevantWikip.timeWikiTraversal, timeTraversalTarget: (tTraversalTarget1 - tTraversalTarget0) });

        }
      }
      tExecWikip1 = performance.now();

      //console.groupEnd();

      // write languages without api into file
      noApiForLang = [... new Set(noApiForLang)];
      invalidTitle = [... new Set(invalidTitle)];

      fs.writeFileSync(file_no_api_lang, JSON.stringify(noApiForLang));
    }

    //console.log('Write dataset entry into file + gather statistics');
    logPipelineProgress.info('Write dataset entry into file + gather statistics');

    let relvSparqlSize = [], relvWikiSize = [];
    entry.relevant.sparql.forEach(item => {
      relvSparqlSize.push({ query: item.query, size: item.result.length });
    });
    entry.relevant.wikipedia.forEach(item => {
      relvWikiSize.push({
        target: item.target,
        sizeTargetType: item.targetType.length,
        sizeNoType: item.noType.length,
        sizeNoTargetType: item.noTargetType.length,
        sizeNoWikidataID: item.noWikidataID.length,
        sizeCatTypeCheckFailed: item.catTypeCheckFailed.length,
      });
    });


    //gather time and other information (prop existance , relv result length ...)
    let statistics = {
      queryID: result[i].setCat,
      query: result[i].result.setCatLabel[0],
      sparql: result[i].sparql != '', timeAnnotSparql: (tAnnotSparql1 - tAnnotSparql0) / 1000,
      contains: result[i].contains != '', timeAnnotContains: (tAnnotPageCat1 - tAnnotPageCat0) / 1000,
      list: result[i].list != '', timeAnnotList: (tAnnotPageList1 - tAnnotPageList0) / 1000,
      timeExecSparql: (tExecSparql1 - tExecSparql0) / 1000, relvSparqlSize: relvSparqlSize,
      timeExecDB: (tExecDBp1 - tExecDBp0) / 1000, relvDBSize: entry.relevant.DBpedia.length,
      timeExecWiki: (tExecWikip1 - tExecWikip0) / 1000, sizes: relvWikiSize
    };

    try {
      logStreamGS.write(JSON.stringify(entry).replace(/http:\/\/www\.wikidata\.org\/entity\//gm, ''));
    }
    catch(e){
      if(e.message == 'Invalid string length'){
        streamEntryWrite(entry,logStreamGS);
      }
    }

    logStreamStat.write(JSON.stringify(statistics));
    logStreamStat.write(',');
    if (i != result.length - 1) {
      logStreamGS.write(',');
    }
    logStreamGS.write('\r\n');

    //console.log('Entry successfully written into '+ Config.outputGS);
    logPipelineProgress.info('Entry successfully written into ' + Config.outputGS);

    //console.groupEnd();

    const timeTreatOneCat1 = performance.now();

    let timesTarget = timeWikiPerTarget.map(item => item);

    timeWikiPerTarget.forEach(target => {
      let timeTreatOneCat = (timeTreatOneCat1 - timeTreatOneCat0);
      timesTarget.forEach(time => {
        if (time.target != target.target) {
          timeTreatOneCat = timeTreatOneCat - time.timeTraversalTarget;
        }
      });

      target['timeTreatOneCat'] = timeTreatOneCat;

      //console.log(`
      //Time Treat one Cat target : ${timeTreatOneCat/1000} s `);
      logPipelineProgress.info(`Time Treat one Cat target : ${timeTreatOneCat / 1000} s`);

      let timeRest = timeTreatOneCat - target.timeWikiTraversal.timeTypeCheck
        - target.timeWikiTraversal.timeTypeCheckPost
        - target.timeWikiTraversal.timeLabelCache
        - target.timeWikiTraversal.timeLabelPost;

      target['timeRest'] = timeRest;

      //console.log(`Time rest : ${timeRest/1000} s `);
      logPipelineProgress.info(`Time rest : ${timeRest / 1000} s `);

      timetraversal.write(JSON.stringify(target));

    });

    if (i != result.length - 1) {
      timetraversal.write(',');
    }

    barWikiTraversal.increment();
  }

  logStreamGS.write(']');
  timetraversal.write(']');

  const end = performance.now();

  let globalStats = {
    timeGetAllCat: (tAllCat1 - tAllCat0) / 1000,
    timeGetLangs: (tAllTitleLangs1 - tAllTitleLangs0) / 1000,
    timeGetQualifCat: (tQualifCat1 - tQualifCat0) / 1000,
    timeGetQualifList: (tQualifList1 - tQualifList0) / 1000,
    timeGetTypes: (tAllKeyType1 - tAllKeyType0) / 1000,
    timeGetTargetLabels: (tAllTargetLabel1 - tAllTargetLabel0) / 1000,
    timeAllSparql: (tAllSparql1 - tAllSparql0) / 1000,
    invalidTitle: invalidTitle,
    totalTime: (end - start) / 1000
  };

  logStreamStat.write(JSON.stringify(globalStats));
  logStreamStat.write(']');

  console.log(`
  Time taken: ${(end - start) / 1000} s`);
  logPipelineProgress.info('Time taken: ' + (end - start) / 1000 + ' s');

  barWikiTraversal.stop();
}
