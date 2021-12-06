import JSONStream                   from 'JSONStream';
import Config                       from './../config/config' ;
import localConfig                  from './config';
const { performance } = require('perf_hooks');

/**
 * Generate native entries
 *
 *
 * @param      {Object}      fs        object for file system node module
 *
 */

export default function generateNativeEntry(fs){

  const start = performance.now();

  console.log('Native entries generation . . .');

  let streamRead = fs.createReadStream(Config.datasetIntermediate , {encoding: 'utf8'});
  let metricsBefore = fs.createWriteStream(Config.metricDatasetIntermediate, { flags: 'a' });
  let metricsAfter = fs.createWriteStream(Config.metricDatasetNative, { flags: 'a' });

  let counterFound = 0 , counterFiltered = 0, id=1 , datasetArray = [], entriesPerKeyword = {}, entriesPerWord = {}, totalKeyword = 0, totalWord = 0, target = {};
  let nrKeyword = new Set(), nrKeywordType = new Set(), relSet = new Set();

  let parser = JSONStream.parse('*');
  streamRead.pipe(parser);

  parser.on('data', entry => {

    counterFound ++;

    let relevant = entry.relevantEntities;
    let sentence = '';
    entry.keywords.forEach((el,i) => {
      if(el.isiri != true){
        sentence += el.label.split('-')[0];
      }
      else{
        sentence += el.label;
      }
      if(i!= entry.keywords.length -1){
        sentence += ' ';
      }
    });

    let newQuery = sentence + ' '+ entry.target.label;

    let element = {queryWikidataID: entry.queryID, query: newQuery, nrKeyword: entry.keywords.length + 1, nrWord:newQuery.split(' ').length , relevantEntitiesSize: relevant.length};

    //filter
    if(element.nrKeyword <= localConfig.maxKeywords && element.relevantEntitiesSize >= localConfig.minRelevantSize){
      counterFiltered ++;
      let datasetItem = {
        queryID: localConfig.IDprefix+id ,
        query: newQuery,
        keywords: entry.keywords,
        target: entry.target,
        relevantEntities: relevant ,
        sparql: entry.sparql,
        metrics: {relevantEntitiesSize: element.relevantEntitiesSize, nrKeyword:element.nrKeyword, nrWord:element.nrWord}
      };
      datasetArray.push(datasetItem);

      entry.keywords.forEach(item => {
        nrKeyword.add(item.iri);
        item.types.forEach(type => {
          nrKeywordType.add(type.type);
        });
      });

      relevant.forEach(item => {
        relSet.add(item.iri);
      });

      if(target.hasOwnProperty(entry.target.iri)){
        target[`${entry.target.iri}`]['freq'] += 1 ;
      }
      else{
        target[`${entry.target.iri}`] = {iri:entry.target.iri, label:entry.target.label, freq: 1};
      }

      if(entriesPerKeyword.hasOwnProperty(JSON.stringify(element.nrKeyword))){
        entriesPerKeyword[`${element.nrKeyword}`] += 1 ;
      }
      else{
        entriesPerKeyword[`${element.nrKeyword}`] = 1;
      }
      if(entriesPerWord.hasOwnProperty(JSON.stringify(element.nrWord))){
        entriesPerWord[`${element.nrWord}`] += 1 ;
      }
      else{
        entriesPerWord[`${element.nrWord}`] = 1;
      }
      totalKeyword += element.nrKeyword ;
      totalWord += element.nrWord ;
      element['queryID'] = localConfig.IDprefix+id ;
      id ++ ;
      metricsAfter.write(JSON.stringify(element));
      metricsAfter.write('\r\n');
    }
    metricsBefore.write(JSON.stringify(element));
    metricsBefore.write('\r\n');
  });

  parser.on('end', () => {

    console.log('Writing entries into file . . .');

    let dataset = fs.createWriteStream(Config.datasetNative, { flags: 'a' });

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

    fs.writeFileSync(Config.statisticDatasetNative, JSON.stringify(statistics));

    console.log(`Time taken: ${(end - start) / 1000} s`);

    console.log('# intermediate entries : ' + counterFound);
    console.log('# native entries : ' + counterFiltered);
  });

}
