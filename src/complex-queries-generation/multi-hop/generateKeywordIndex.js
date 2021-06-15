import JSONStream                   from 'JSONStream';
import Config                       from './../../config/config' ;
const { performance } = require('perf_hooks');

/**
 * generate keyword to category index , for each category and for each keyword generate index in following form:
 * {keywordIri1 , keywordLabel1} => [{category:{iri: , label:, relevantSize:}, target:{iri: , label:} , keywords:}, ..],
 * {keywordIri2 , keywordLabel2} => [...],
 *
 * @param      {Object}      fs        object for file system node module
 *
 */

export default function generateKeywordIndex(fs){

  const start = performance.now();

  console.log('Group entries by keyword . . .');

  let catByKeyword = {};

  let stream = fs.createReadStream(Config.datasetIntermediate , {encoding: 'utf8'});

  let parser = JSONStream.parse('*');
  stream.pipe(parser);

  // group categories by keyword
  parser.on('data', entry => {
    //store size of relevant results
    let relevant = entry.relevantEntities ;
    let relevantSize = relevant.length ;
    //take keywords
    let keywords = entry.keywords.map(keyword => {return {iri: keyword.iri, label:keyword.label};});
    keywords.forEach(keyword => {
      let keywordKey = JSON.stringify(keyword);
      if(catByKeyword.hasOwnProperty(keywordKey)){
        catByKeyword[keywordKey].push({cat:{iri: entry.queryID, label:entry.query, relevantSize: relevantSize}, target:entry.target , keywords:keywords});
      }
      else{
        catByKeyword[keywordKey] = [{cat:{iri: entry.queryID, label:entry.query, relevantSize:relevantSize}, target:entry.target , keywords:keywords}];
      }
    });
  });

  parser.on('end', () => {
    const end = performance.now();
    console.log(`Time taken: ${(end - start) / 1000} s`);
    console.log('# total distinct keywords : ' + Object.keys(catByKeyword).length);
    fs.writeFileSync(Config.keywordEntryIndex, JSON.stringify(catByKeyword));

  });

}
