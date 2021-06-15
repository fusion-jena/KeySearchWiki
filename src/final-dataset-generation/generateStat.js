import Config                   from './../config/config';
import JSONStream               from 'JSONStream';

const { performance } = require('perf_hooks');

/**
 * generate statistics from output dataset (e.g., dataset-final.json)
 *
 * @param     {Object}      fs              object for file system node module
 * @param     {Object}      fileNameData    name of the file to generate statistics for
 * @param     {Object}      fileNameStat    name of the file where to write statistics
 */

export default function generateStat(fs, fileNameData, fileNameStat){

  const start = performance.now();

  console.log('Generating statistics. . .');

  let dataset = fs.createReadStream(Config.outputGS + fileNameData , {encoding: 'utf8'});

  let entryCount = 0 , entriesPerKeyword = {}, entriesPerWord = {}, totalKeyword = 0, totalWord = 0, target = {};
  let nrKeyword = new Set(), nrKeywordType = new Set(), relSet = new Set();
  let mk = 0 , mh = 0 , nt = 0 ;

  let parser = JSONStream.parse('*');
  dataset.pipe(parser);

  parser.on('data', entry => {

    entryCount ++ ;

    let queryID = entry.queryID;
    if(queryID.includes('NT')){
      nt ++;
    }
    if(queryID.includes('MK')){
      mk ++;
    }
    if(queryID.includes('MH')){
      mh ++;
    }

    entry.keywords.forEach(item => {
      nrKeyword.add(item.iri);
      item.types.forEach(type => {
        nrKeywordType.add(type.type);
      });
    });

    entry.relevantEntities.forEach(item => {
      relSet.add(item.iri);
    });

    if(target.hasOwnProperty(entry.target.iri)){
      target[`${entry.target.iri}`]['freq'] += 1 ;
    }
    else{
      target[`${entry.target.iri}`] = {iri:entry.target.iri, label:entry.target.label, freq: 1};
    }

    if(entriesPerKeyword.hasOwnProperty(JSON.stringify(entry.metrics.nrKeyword))){
      entriesPerKeyword[`${entry.metrics.nrKeyword}`] += 1 ;
    }
    else{
      entriesPerKeyword[`${entry.metrics.nrKeyword}`] = 1;
    }
    if(entriesPerWord.hasOwnProperty(JSON.stringify(entry.metrics.nrWord))){
      entriesPerWord[`${entry.metrics.nrWord}`] += 1 ;
    }
    else{
      entriesPerWord[`${entry.metrics.nrWord}`] = 1;
    }
    totalKeyword += entry.metrics.nrKeyword ;
    totalWord += entry.metrics.nrWord ;

  });

  parser.on('end', () => {

    const end = performance.now();

    let statistics = {
      nrEntries : entryCount ,
      distribution: {native: nt , multiH: mh , multiK: mk  },
      target : {nrTarget: Object.keys(target).length , distribution: Object.keys(target).map(el => target[el]).sort((a, b) => (a.freq < b.freq) ? 1 : -1)},
      keyword: {distribution: entriesPerKeyword, average: totalKeyword/entryCount, nrKeyword:nrKeyword.size, nrKeywordType:nrKeywordType.size},
      word: {distribution: entriesPerWord, average: totalWord/entryCount},
      nrRelEnt: relSet.size,
      time: (end - start) / 1000
    };

    fs.writeFileSync(Config.outputGS + fileNameStat, JSON.stringify(statistics));

    console.log(`Time taken: ${(end - start) / 1000} s`);


  });

}
