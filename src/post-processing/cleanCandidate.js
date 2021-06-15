import Config                   from './../config/config';
import localConfig              from './config';
import JSONStream               from 'JSONStream';
const { performance } = require('perf_hooks');

/**
 * clean raw entries
 * remove queries without target (target used by wikipedia traversal): contains empty
 * remove queries with more than one keyword/target value (multi-target)
 * remove queries where wikipedia results empty, reasons:
 * 1) relevant.wikipedia = [] => contains empty , no corresponding wikipedia page (e.g., Q31877037) or,  wikidata page was deleted (e.g.,Q8576710)
 * 2) "targetType":[],"noType":[],"noTargetType":[],"noWikidataID":[] =>  wikipedia page empty (e.g., because of redirect, e.g., Q24865978), or
 *     type check failed from first cat , e.g., Q9002458 : // TODO: if depth == 0 and category has members store them .
 * remove queries with no keywords (depends on annotation completeness)
 * remove not needed data (e.g., catTypecheckFailed , noWikidataId ...)
 * remove entries containing keywords without labels (e.g., https://www.wikidata.org/wiki/Q20884860) or unknown values (e.g., https://www.wikidata.org/wiki/Q10102489)
 * @param     {Object}      fs              object for file system node module
 *
 */

export default function cleanCandidate(fs){

  const start = performance.now();

  console.log('Candidate cleaning. . .');

  let interEntryCount = 0 , rawEntryCount = 0 , datasetArray = [];

  let stream = fs.createReadStream(Config.rawData , {encoding: 'utf8'});

  let parser = JSONStream.parse('*');
  stream.pipe(parser);

  parser.on('data', entry => {
    rawEntryCount ++ ;

    let containsExist = (entry.contains != '' && entry.contains.length > 0) ,
        multiTarget = (entry.contains.length > 1),
        wikipediaEmpty = (entry.relevant.wikipedia.length == 0);

    if(containsExist && !multiTarget && !wikipediaEmpty){
      let relevantMerged,
          relevant = entry.relevant.wikipedia[0];
      if(localConfig.relevantEntitiesClass == 'targetType'){
        relevantMerged = relevant.targetType.map(item => {return {iri: item.iri, label:item.iriLabel};});
      }
      else{
        relevantMerged = [... relevant.targetType, ... relevant.noType , ... relevant.noTargetType].map(item => {return {iri: item.iri, label:item.iriLabel};});
      }
      let keywordExist = (entry.contains[0].keywords.length > 0),
          relevantEmpty = (relevant.length == 0 || relevantMerged.length == 0) ;
      if(keywordExist && !relevantEmpty){
        // remove entries containing keywords without labels or unknown values (e.g., t882159834)
        let reg = /^Q\d+$|^t\d+$/g;
        let check = true ;

        for (let i = 0; i < entry.contains[0].keywords.length; i++) {
          if(entry.contains[0].keywords[i].label.match(reg) != null){
            check = false ;
            break;
          }
        }

        if(check){
        //remove not needed data construct intermediate entry
        // add also relevant results from sparql and sparql query if exist (will potentially serve for evaluation)
        // here also some set categories could have multiple sparql queries select the ones with just one sparql query
          let multiSparql = (entry.relevant.sparql.length > 1);
          let sparql = '';
          if(entry.sparql != ''){
            if(!multiSparql){
              sparql = entry.relevant.sparql[0];
            }
          }

          let interEntry = {
            queryID: entry.queryID ,
            query: entry.query,
            keywords: entry.contains[0].keywords,
            target: {iri: entry.contains[0].target , label:entry.contains[0].targetLabel},
            relevantEntities: relevantMerged ,
            sparql: sparql
          };

          datasetArray.push(interEntry);
          interEntryCount ++;

        }

      }
    }


  });

  parser.on('end', () => {

    console.log('Writing entries into file ...');
    let inter = fs.createWriteStream(Config.datasetIntermediate, {flags: 'a'});

    inter.write('[');
    inter.write('\r\n');

    datasetArray.forEach((item, i) => {
      inter.write(JSON.stringify(item));
      if(i!=  datasetArray.length - 1){
        inter.write(',');
      }
      inter.write('\r\n');
    });

    inter.write(']');

    const end = performance.now();

    console.log(`Time taken: ${(end - start) / 1000} s`);
    console.log('# intermediate entries: '+ interEntryCount +' / # raw entries: '+ rawEntryCount );
  });

}
