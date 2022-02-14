import Cache                    from './../util/cache';
import Config                   from './../config/config';
import Readline                 from 'readline';
import  Fs                      from 'fs';
import JSONStream               from 'JSONStream';

/**
 * adjust queries : if one of the keyword is have the target type/ target is in its subclass hierarchy remove target , else keep original query
 *
 *
 *
 *
 */

export default async function normalize(){

  console.log('Naturalizing Queries . . . ');

  //prepare file reading
  const stream = Fs.createReadStream(Config.queryIRI),
        reader = Readline.createInterface( stream );
  //setup cache
  let cache = new Cache('subclasses', 'target');

  let target, keywords = [], queryID, queries = [];

  //go through KeySearchWiki-queries-iri file
  for await (const line of reader ) {

    let elements = line.split(' ');
    queryID = elements[0];

    target = elements[elements.length - 1];
    keywords = [];
    elements.forEach((item, i) => {
      if(i!=0 && i!=elements.length - 1){
        keywords.push(item);
      }
    });

    let resp = cache.getValues([target]);

    let ofTarget = false ;

    for (const keyword of keywords){
      if(resp.hits[0].result.map(i=>i.sub).includes(keyword)){
        ofTarget = true ;
        break;
      }
    }

    if(ofTarget){
      queries.push(queryID);
    }

  }

  let json = Fs.createReadStream(Config.jsonFormat , {encoding: 'utf8'});
  let naturalized = Fs.createWriteStream(Config.outputGS + 'naturalized-queries.txt', {flags: 'a'});
  let keySearchWikiNaturArray = [];

  let parser = JSONStream.parse('*');
  json.pipe(parser);

  parser.on('data', entry => {

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

    if(queries.some(e => e == entry.queryID)){
      keySearchWikiNaturArray.push(`${entry.queryID} ${sentence}`);
      naturalized.write(`${entry.queryID} ${sentence}`);
      naturalized.write('\r\n');
    }
    else {
      keySearchWikiNaturArray.push(`${entry.queryID} ${entry.query}`);
    }


  });

  parser.on('end', () => {
    let keySearchWikiNatur = Fs.createWriteStream(Config.queryNatur, {flags: 'a'});
    let naturalizedStats = Fs.createWriteStream(Config.outputGS + 'statistics-naturalized-queries.json', {flags: 'a'});

    naturalizedStats.write(JSON.stringify({naturalizedQueriesNr: queries.length, naturalizedQueries: queries}));

    keySearchWikiNaturArray.forEach((item, i) => {
      keySearchWikiNatur.write(item);
      if(i!=  keySearchWikiNaturArray.length - 1){
        keySearchWikiNatur.write('\r\n');
      }
    });

  });

}
