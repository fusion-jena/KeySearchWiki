/**
 * group naturalized queries and relevant results by query type (NT, MK, MH), select only queries from top-10 targets
 *
 *
 */

import fs         	from 'fs';
import localConfig  from './../config';
import config       from './../../config/config';
import JSONStream   from 'JSONStream';
import Readline     from 'readline';

(async function(){

  console.log('Group naturalized queries by query type from JSON , select queries from top-10 targets . . . ');

  //prepare file reading
  const stream = fs.createReadStream(config.outputGS + 'naturalized-queries.txt'),
        reader = Readline.createInterface( stream );

  let naturalizedMap = new Map();

  for await (const line of reader ) {

    if(line != ''){
      let elements = line.split(' ');
      let queryID = elements.shift();
      let query = elements.join(' ');
      naturalizedMap.set(queryID, query);
    }
  }

  let NTqueries= fs.createWriteStream(localConfig.queriesDir + 'nt-queries.txt', {flags: 'a'});
  let MKqueries= fs.createWriteStream(localConfig.queriesDir + 'mk-queries.txt', {flags: 'a'});
  let MHqueries= fs.createWriteStream(localConfig.queriesDir + 'mh-queries.txt', {flags: 'a'});

  let NTqrels= fs.createWriteStream(localConfig.qrelsDir + 'nt-qrels.txt', {flags: 'a'});
  let MKqrels= fs.createWriteStream(localConfig.qrelsDir + 'mk-qrels.txt', {flags: 'a'});
  let MHqrels= fs.createWriteStream(localConfig.qrelsDir + 'mh-qrels.txt', {flags: 'a'});

  let json = fs.createReadStream(config.jsonFormat , {encoding: 'utf8'});

  let parser = JSONStream.parse('*');
  json.pipe(parser);

  parser.on('data', entry => {
    let newQuery = entry.query ;
    if(naturalizedMap.has(entry.queryID)){
      newQuery = naturalizedMap.get(entry.queryID);
    }
    if(entry.queryID.substring(0,2) == 'NT' && localConfig.targets.some(item => item == entry.target.iri)){
      NTqueries.write(`${entry.queryID} ${newQuery}`);
      NTqueries.write('\r\n');
      entry.relevantEntities.forEach(entity => {
        NTqrels.write(`${entry.queryID} 0 ${entity.iri} 1`);
        NTqrels.write('\r\n');
      });
    }

    if(entry.queryID.substring(0,2) == 'MK' && localConfig.targets.some(item => item == entry.target.iri)){
      MKqueries.write(`${entry.queryID} ${newQuery}`);
      MKqueries.write('\r\n');
      entry.relevantEntities.forEach(entity => {
        MKqrels.write(`${entry.queryID} 0 ${entity.iri} 1`);
        MKqrels.write('\r\n');
      });
    }

    if(entry.queryID.substring(0,2) == 'MH' && localConfig.targets.some(item => item == entry.target.iri)){
      MHqueries.write(`${entry.queryID} ${newQuery}`);
      MHqueries.write('\r\n');
      entry.relevantEntities.forEach(entity => {
        MHqrels.write(`${entry.queryID} 0 ${entity.iri} 1`);
        MHqrels.write('\r\n');
      });
    }

  });

})();
