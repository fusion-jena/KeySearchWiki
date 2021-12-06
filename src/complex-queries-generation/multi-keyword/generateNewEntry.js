import Config                   from './../../config/config';
import localConfig              from './config';
import JSONStream               from 'JSONStream';
import generateIntersection     from './generateIntersection';
const { performance } = require('perf_hooks');
/**
 * generate multi-keyword new queries
 * 1) construct an inverted index from relevant result (iri) to categorie (query) grouped by target e.g.,
 *{ target1 : {
                iri1:[cat1, cat2],
                iri2:[cat3, cat2],
                ...
              }
    target2: {
      ...
    }
  },
 *
 * 2) for the valid combinations given by the inverted index (min 2 cats in [cat1, cat2 ..]), construct new queries and filter
 *
 * @param     {Object}      fs        object for file system node module
 *
 */

export default function generateNewEntry(fs){

  const start = performance.now();

  console.log('RelevantEntities-Entry inverted index creation . . .');

  let iriByTarget = {};

  // use stream to read per element (parse does not work for large strings)
  let stream = fs.createReadStream(Config.datasetIntermediate , {encoding: 'utf8'});

  let parser = JSONStream.parse('*');
  stream.pipe(parser);

  let entriesMap = new Map();

  parser.on('data', entry => {
    //group by target
    let target = JSON.stringify(entry.target);
    let keywords = entry.keywords;
    let relevant = entry.relevantEntities;
    //fill category => value Map for quick category lookup afterwards
    entriesMap.set(entry.queryID, relevant);
    if(!iriByTarget.hasOwnProperty(target)){
      let relevantWithSource = {};
      relevant.forEach(item => {
        relevantWithSource[item.iri] =  [{cat:{iri: entry.queryID, label:entry.query}, keywords:keywords}];
      });
      iriByTarget[target] = relevantWithSource;
    }
    else{
      relevant.forEach(item => {
        if(iriByTarget[target].hasOwnProperty(item.iri)){
          iriByTarget[target][item.iri].push({cat:{iri: entry.queryID, label:entry.query}, keywords:keywords});
        }
        else{
          iriByTarget[target][item.iri] = [{cat:{iri: entry.queryID, label:entry.query}, keywords:keywords}];
        }
      });
    }

  });

  parser.on('end', () => {

    let combiSet = new Set(), countAllCombis = 0 ;

    //let metricsBefore = fs.createWriteStream(Config.metricMultikeyBefore, {flags: 'a'});
    let metricsAfter = fs.createWriteStream(Config.metricMultikeyNewDataset, {flags: 'a'});
    let dataset = fs.createWriteStream(Config.multikeyNewDataset, {flags: 'a'});

    let datasetArray = [], counterFound = 0 , counterFiltered = 0, id=1 ,entriesPerKeyword = {}, entriesPerWord = {}, totalKeyword = 0, totalWord = 0, targetSet = {};
    let nrKeyword = new Set(), nrKeywordType = new Set(), relSet = new Set();

    console.log('Possible entries combinations selection + New entry construction + Filtering + Writing into file ...');

    Object.keys(iriByTarget).forEach(target => {
      Object.keys(iriByTarget[target]).forEach(iri => {
        if(iriByTarget[target][iri].length > 1){
          //TODO , when also bigger arrays suported , iriByTarget[target][iri].length > 32
          //let allcombis = arrayCombis(iriByTarget[target][iri]);
          //allcombis = allcombis.filter(combi => combi.length > 1);
          let cb = iriByTarget[target][iri].map(cb => cb.cat.iri);
          //allcombis.forEach(cb => {
          let combiString = JSON.stringify(cb.sort());
          let keywordsWithType = [];

          iriByTarget[target][iri].forEach(category => {
            category.keywords.forEach(keyword => {
              if(!keywordsWithType.some(element => element.iri == keyword.iri)){
                keywordsWithType.push(keyword);
              }
            });
          });

          let sentence = '';

          keywordsWithType.forEach((el,i) => {
            if(el.isiri != true){
              sentence += el.label.split('-')[0];
            }
            else{
              sentence += el.label;
            }
            if(i!= keywordsWithType.length -1){
              sentence += ' ';
            }
          });

          let newQuery = sentence + ' '+ JSON.parse(target).label;

          if(!combiSet.has(combiString)){
            combiSet.add(combiString);

            countAllCombis ++ ;

            if(keywordsWithType.length + 1  <= localConfig.maxKeywords){

              let intersection = generateIntersection(cb, entriesMap);

              let  newEntry = {newQuery: {target: JSON.parse(target), keywords:keywordsWithType, query: newQuery}, combinedEntries: cb.sort(), combinedEntriesSize:cb.length, intersect: intersection.intersect ,newQueryRelevantSize: intersection.intersectSize, nrKeyword: keywordsWithType.length + 1, nrWord:newQuery.split(' ').length};

              counterFound ++ ;

              if(newEntry.newQueryRelevantSize >= localConfig.minRelevantSize){
                counterFiltered ++;
                let datasetItem = {
                  queryID: localConfig.IDprefix+id ,
                  query: newEntry.newQuery.query,
                  keywords: newEntry.newQuery.keywords,
                  target: newEntry.newQuery.target,
                  relevantEntities: newEntry.intersect ,
                  sparql:'',
                  metrics: {relevantEntitiesSize: newEntry.newQueryRelevantSize, nrKeyword:newEntry.nrKeyword, nrWord:newEntry.nrWord }
                };

                datasetArray.push(datasetItem);

                newEntry.newQuery.keywords.forEach(item => {
                  nrKeyword.add(item.iri);
                  item.types.forEach(type => {
                    nrKeywordType.add(type.type);
                  });
                });

                newEntry.intersect.forEach(item => {
                  relSet.add(item.iri);
                });

                if(targetSet.hasOwnProperty(newEntry.newQuery.target.iri)){
                  targetSet[`${newEntry.newQuery.target.iri}`]['freq'] += 1 ;
                }
                else{
                  targetSet[`${newEntry.newQuery.target.iri}`] = {iri:newEntry.newQuery.target.iri, label:newEntry.newQuery.target.label, freq:1};
                }

                if(entriesPerKeyword.hasOwnProperty(JSON.stringify(newEntry.nrKeyword))){
                  entriesPerKeyword[`${newEntry.nrKeyword}`] += 1 ;
                }
                else{
                  entriesPerKeyword[`${newEntry.nrKeyword}`] = 1;
                }
                if(entriesPerWord.hasOwnProperty(JSON.stringify(newEntry.nrWord))){
                  entriesPerWord[`${newEntry.nrWord}`] += 1 ;
                }
                else{
                  entriesPerWord[`${newEntry.nrWord}`] = 1;
                }
                totalKeyword += newEntry.nrKeyword ;
                totalWord += newEntry.nrWord ;
                newEntry['queryID'] = localConfig.IDprefix+id ;
                id ++ ;
                delete newEntry.intersect;
                metricsAfter.write(JSON.stringify(newEntry));
                metricsAfter.write('\r\n');

              }

              if(newEntry.hasOwnProperty('intersect')){
                delete newEntry.intersect;
              }
              //metricsBefore.write(JSON.stringify(newEntry));
              //metricsBefore.write('\r\n');
            }
          }

          //});

        }
      });
    });

    dataset.write('[');
    dataset.write('\r\n');

    datasetArray.forEach((item, i) => {
      dataset.write(JSON.stringify(item));
      if(i!=  datasetArray.length - 1){
        dataset.write(',');
      }
      dataset.write('\r\n');
    });

    dataset.write(']');

    const end = performance.now();

    let statistics = {
      originalEntries : countAllCombis ,
      intermediateFiltered: counterFound ,
      finalFilteredEntries : counterFiltered,
      target : {nrTarget: Object.keys(targetSet).length , distribution: Object.keys(targetSet).map(el => targetSet[el]).sort((a, b) => (a.freq < b.freq) ? 1 : -1)},
      keyword: {distribution: entriesPerKeyword, average: totalKeyword/counterFiltered, nrKeyword:nrKeyword.size, nrKeywordType:nrKeywordType.size},
      word: {distribution: entriesPerWord, average: totalWord/counterFiltered},
      nrRelEnt: relSet.size,
      time: (end - start) / 1000
    };

    fs.writeFileSync(Config.statisticMultikeyNewDataset, JSON.stringify(statistics));

    console.log(`Time taken: ${(end - start) / 1000} s`);
    console.log('# all distinct new entries (multi-keyword) : ' + counterFound);
    console.log('# filtered new entries (multi-keyword) : ' + counterFiltered);

  });


}
