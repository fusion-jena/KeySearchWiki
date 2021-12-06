import JSONStream                   from 'JSONStream';
import Config                       from './../../config/config' ;
import localConfig                  from './config';
const { performance } = require('perf_hooks');

/**
 * generate multi-hop new queries
 * for each element in relevant results of a category , if relevant result found in keyword index , a combination is possible, form iri to keyword categories index in this way:
 * {iri: , label: , cat:{iri: , label:, target:}, relevantSize:, keywords: } => [keyword value from keyword index (array of categories containing this keyword)] (transitive entry linking)
 *
 * @param      {Object}      fs        object for file system node module
 *
 */

export default function generateNewEntry(fs){

  const start = performance.now();

  console.log('Transitive entry linking . . .');

  let keywordIndex = JSON.parse(fs.readFileSync(Config.keywordEntryIndex));

  let linkedEntries = {};
  let entriesMap = new Map();

  let stream = fs.createReadStream(Config.datasetIntermediate , {encoding: 'utf8'});

  let parser = JSONStream.parse('*');
  stream.pipe(parser);

  parser.on('data', entry => {
    let target = entry.target;
    let relevant = entry.relevantEntities;
    entriesMap.set(entry.queryID, {relevant: relevant, keywords:entry.keywords});
    relevant.forEach(item => {
      let itemKey = JSON.stringify({iri: item.iri, label:item.label});
      if(keywordIndex.hasOwnProperty(itemKey)){
        let keywords = entry.keywords.map(keyword => {return {iri: keyword.iri, label:keyword.label};}).sort((a, b) => (a.iri > b.iri) ? 1 : -1);
        let key = JSON.stringify({iri:item.iri , label:item.iriLabel , cat:{iri: entry.queryID, label:entry.query, target:target }, relevantSize: relevant.length, keywords: keywords});
        if(linkedEntries.hasOwnProperty(key)){
          linkedEntries[key] = [...linkedEntries[key], ...keywordIndex[itemKey]];
        }
        else{
          linkedEntries[key] = keywordIndex[itemKey];
        }
      }
    });
  });

  parser.on('end', () => {

    console.log('# total linked entries : ' + Object.keys(linkedEntries).length);

    //fs.writeFileSync(Config.linkedEntryIndex, JSON.stringify(linkedEntries));

    console.log('Generate clusters . . .');

    let linkings = {};

    Object.keys(linkedEntries).forEach(key => {
      let iri = JSON.parse(key).iri;
      let newKeyString = JSON.stringify({cat: JSON.parse(key).cat , relevantSize: JSON.parse(key).relevantSize, keywords: JSON.parse(key).keywords});
      if(linkings.hasOwnProperty(newKeyString)){
        linkedEntries[key].forEach(cat => {
          //filter present iri from keywords list
          let keyword = cat.keywords.filter(element => element.iri != iri).sort((a, b) => (a.iri > b.iri) ? 1 : -1);
          let clusterKey  = JSON.stringify({keyword: keyword, target:cat.target});
          if(linkings[newKeyString].hasOwnProperty(clusterKey)){
            linkings[newKeyString][clusterKey].push({iri:iri, label:JSON.parse(key).label , cat: cat.cat});
          }
          else{
            linkings[newKeyString][clusterKey] = [{iri:iri , label:JSON.parse(key).label, cat: cat.cat}];
          }
        });

      }
      else{
        linkedEntries[key].forEach(cat => {
          let keyword = cat.keywords.filter(element => element.iri != iri).sort((a, b) => (a.iri > b.iri) ? 1 : -1);
          let clusterKey  = JSON.stringify({keyword: keyword, target:cat.target});
          let cluster = {};
          cluster[clusterKey] = [{iri:iri , label:JSON.parse(key).label, cat: cat.cat}];
          linkings[newKeyString] = cluster ;
        });
      }
    });

    //fs.writeFileSync(Config.entryCluster, JSON.stringify(linkings));

    console.log('New entry construction + Filtering + Writing into file ...');

    let queries = [];

    Object.keys(linkings).forEach(key => {

      let queryID = JSON.parse(key).cat.iri;
      let part1Keywords = entriesMap.get(queryID).keywords;

      Object.keys(linkings[key]).forEach(cluster => {

        //do not add queries having same target in initial and cluster categories does not make sense if keyword2 from cluster is empty, we end up having the same initial category
        // also if keyword from cluster is not empty we end up combining with # KWs
        if(JSON.parse(cluster).target.iri == JSON.parse(key).cat.target.iri){
          return ;
        }

        let newQueryRelevantSize = 0 ;
        let union = [];

        let part2Keywords = [];

        linkings[key][cluster].forEach(element => {
          let newQueryRelevant = entriesMap.get(element.cat.iri).relevant;
          let allKeywords = entriesMap.get(element.cat.iri).keywords;
          allKeywords.forEach(item => {
            if(item.iri != element.iri){
              if(!part2Keywords.some(x => x.iri == item.iri)){
                part2Keywords.push(item);
              }
            }
          });

          union = union.concat(newQueryRelevant);
          newQueryRelevantSize += element.cat.relevantSize ;
        });

        let newQueryKeywords = part1Keywords.concat(part2Keywords);

        let sentence = '';

        newQueryKeywords.forEach((el,i) => {
          if(el.isiri != true){
            sentence += el.label.split('-')[0];
          }
          else{
            sentence += el.label;
          }
          if(i!= newQueryKeywords.length -1){
            sentence += ' ';
          }
        });

        let newQuery = sentence + ' '+ JSON.parse(cluster).target.label;

        // remove duplicates from union

        const unionSet = [];
        const map = new Map();
        for (const item of union) {
          if(!map.has(item.iri)){
            map.set(item.iri, true);
            unionSet.push({
              iri: item.iri,
              label: item.label
            });
          }
        }

        let entry = {currentEntry : JSON.parse(key).cat , clusterSubset: linkings[key][cluster].slice(0, 5)  , newQuery: {target: JSON.parse(cluster).target, keywords:newQueryKeywords, query: newQuery},union: unionSet,  nrKeyword: newQueryKeywords.length + 1, nrWord:newQuery.split(' ').length,  clusterSize: linkings[key][cluster].length , currentEntryRelevantSize: JSON.parse(key).relevantSize, coverage: linkings[key][cluster].length / JSON.parse(key).relevantSize, newQueryRelevantSize:newQueryRelevantSize};
        queries.push(entry);
      });
    });

    //let metricsBefore = fs.createWriteStream(Config.metricMultihopBefore, { flags: 'a' });
    let metricsAfter = fs.createWriteStream(Config.metricMultihopNewDataset, { flags: 'a' });
    let dataset = fs.createWriteStream(Config.multihopNewDataset, { flags: 'a' });

    let counterFound = 0 , counterFiltered = 0, id=1 , datasetArray = [], entriesPerKeyword = {}, entriesPerWord = {}, totalKeyword = 0, totalWord = 0, target = {};
    let nrKeyword = new Set(), nrKeywordType = new Set(), relSet = new Set();

    queries.forEach(query => {
      counterFound ++ ;
      //filter
      if(query.coverage >= localConfig.minCoverage && query.nrKeyword <= localConfig.maxKeywords && query.newQueryRelevantSize >= localConfig.minRelevantSize){
        counterFiltered ++;
        let datasetItem = {
          queryID: localConfig.IDprefix+id ,
          query: query.newQuery.query,
          keywords: query.newQuery.keywords,
          target: query.newQuery.target,
          relevantEntities: query.union ,
          sparql:'',
          metrics: {relevantEntitiesSize: query.newQueryRelevantSize, nrKeyword:query.nrKeyword, nrWord:query.nrWord, coverage: query.coverage}
        };
        datasetArray.push(datasetItem);

        query.newQuery.keywords.forEach(item => {
          nrKeyword.add(item.iri);
          item.types.forEach(type => {
            nrKeywordType.add(type.type);
          });
        });

        query.union.forEach(item => {
          relSet.add(item.iri);
        });


        if(target.hasOwnProperty(query.newQuery.target.iri)){
          target[`${query.newQuery.target.iri}`]['freq'] += 1 ;
        }
        else{
          target[`${query.newQuery.target.iri}`] = {iri:query.newQuery.target.iri, label:query.newQuery.target.label, freq:1};
        }

        if(entriesPerKeyword.hasOwnProperty(JSON.stringify(query.nrKeyword))){
          entriesPerKeyword[`${query.nrKeyword}`] += 1 ;
        }
        else{
          entriesPerKeyword[`${query.nrKeyword}`] = 1;
        }
        if(entriesPerWord.hasOwnProperty(JSON.stringify(query.nrWord))){
          entriesPerWord[`${query.nrWord}`] += 1 ;
        }
        else{
          entriesPerWord[`${query.nrWord}`] = 1;
        }
        totalKeyword += query.nrKeyword ;
        totalWord += query.nrWord ;
        query['queryID'] = localConfig.IDprefix+id ;
        id ++ ;
        delete query.union;
        metricsAfter.write(JSON.stringify(query));
        metricsAfter.write('\r\n');
      }

      if(query.hasOwnProperty('union')){
        delete query.union;
      }
      //metricsBefore.write(JSON.stringify(query));
      //metricsBefore.write('\r\n');
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
      originalEntries : counterFound ,
      filteredEntries : counterFiltered,
      target : {nrTarget: Object.keys(target).length , distribution: Object.keys(target).map(el => target[el]).sort((a, b) => (a.freq < b.freq) ? 1 : -1)},
      keyword: {distribution: entriesPerKeyword, average: totalKeyword/counterFiltered, nrKeyword:nrKeyword.size, nrKeywordType:nrKeywordType.size},
      word: {distribution: entriesPerWord, average: totalWord/counterFiltered},
      nrRelEnt: relSet.size,
      time: (end - start) / 1000
    };

    fs.writeFileSync(Config.statisticMultihopNewDataset, JSON.stringify(statistics));

    console.log(`Time taken: ${(end - start) / 1000} s`);
    console.log('# all distinct new entries (multi-hop) : ' + counterFound);
    console.log('# filtered new entries (multi-hop) : ' + counterFiltered);

  });

}
