import Config                   from './../config/config';
import JSONStream               from 'JSONStream';

const { performance } = require('perf_hooks');

/**
 * generate files in deliverable formats TREC / JSON
 *
 * @param     {Object}      fs              object for file system node module
 *
 */

export default function finalFormat(fs){

  const start = performance.now();

  console.log('Generate final format (TREC/JSON) . . .');

  let final = fs.createReadStream(Config.finalDataset , {encoding: 'utf8'});

  let jsonArray = [], queryLabelArray = [], queryIRIArray = [], qrelsTRECArray = [];

  let parser = JSONStream.parse('*');
  final.pipe(parser);

  parser.on('data', entry => {
    delete entry.sparql;
    delete entry.metrics;
    jsonArray.push(entry);

    let trecLabel = `${entry.queryID} ${entry.query}`;
    queryLabelArray.push(trecLabel);

    let irisKeyword = '';

    entry.keywords.forEach((el,i) => {
      irisKeyword += el.iri;
      if(i!= entry.keywords.length -1){
        irisKeyword += ' ';
      }
    });

    let trecIRI = `${entry.queryID} ${irisKeyword} ${entry.target.iri}`;
    queryIRIArray.push(trecIRI);

    entry.relevantEntities.forEach(entity => {
      let qrel = `${entry.queryID} 0 ${entity.iri} 1`;
      qrelsTRECArray.push(qrel);
    });


  });

  parser.on('end', () => {

    console.log('Writing into file . . .');

    let jsonFormat = fs.createWriteStream(Config.jsonFormat, {flags: 'a'});
    let queryLabel = fs.createWriteStream(Config.queryLabel, {flags: 'a'});
    let queryIRI = fs.createWriteStream(Config.queryIRI, {flags: 'a'});
    let qrelsTREC = fs.createWriteStream(Config.qrelsTREC, {flags: 'a'});

    jsonFormat.write('[');
    jsonFormat.write('\r\n');

    jsonArray.forEach((item, i) => {
      jsonFormat.write(JSON.stringify(item));
      if(i!=  jsonArray.length - 1){
        jsonFormat.write(',');
      }
      jsonFormat.write('\r\n');
    });

    jsonFormat.write(']');

    queryLabelArray.forEach((item, i) => {
      queryLabel.write(item);
      if(i!=  queryLabelArray.length - 1){
        queryLabel.write('\r\n');
      }
    });

    queryIRIArray.forEach((item, i) => {
      queryIRI.write(item);
      if(i!=  queryIRIArray.length - 1){
        queryIRI.write('\r\n');
      }
    });

    qrelsTRECArray.forEach((item, i) => {
      qrelsTREC.write(item);
      if(i!=  qrelsTRECArray.length - 1){
        qrelsTREC.write('\r\n');
      }
    });

    const end = performance.now();

    console.log(`Time taken: ${(end - start) / 1000} s`);

  });

}
