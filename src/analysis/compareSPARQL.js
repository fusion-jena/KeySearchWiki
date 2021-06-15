import Config                       from './../config/config' ;
import JSONStream                   from 'JSONStream';
import _                            from 'lodash';

/**
 * compare results coming from SPARQL queries attached to some set categories with results coming from wikipedia
 *
 * @param      {Object}      fs        object for file system node module
 *
 */

export default function compareSPARQL(fs){

  console.log('Analyse . . .');

  let stream = fs.createReadStream(Config.datasetNative , {encoding: 'utf8'});

  let parser = JSONStream.parse('*');
  stream.pipe(parser);

  let sparql = [];

  parser.on('data', entry => {
    if(entry.sparql != '' && entry.sparql.result[0].item != 'timeout'){
      sparql.push(entry);
    }
  });

  parser.on('end', () => {

    //let compareCSV = fs.createWriteStream(Config.eval+'.csv', {flags: 'a'});
    let compareJSON = fs.createWriteStream(Config.eval+'.json', {flags: 'a'});

    //compareCSV.write('queryID,query,sparql,intersection/sparqlSize,intersection/wikiSize,sparqlSize,wikiSize,intersection,onlyInSparql,onlyInWiki');
    //compareCSV.write('\r\n');

    sparql.forEach(item => {
      let relevantSparql = item.sparql.result.map(element => {return JSON.stringify({iri:element.item , label:element.itemLabel});});
      let relevantWiki = item.relevantEntities.map(element => JSON.stringify(element));
      let intersect = _.intersection(relevantSparql, relevantWiki);
      let onlyInSparql = _.difference(relevantSparql, relevantWiki);
      let onlyInWiki =  _.difference(relevantWiki, relevantSparql);

      //compareCSV.write(`${item.queryID},${item.query},${item.sparql.query},${intersect.length/relevantSparql.length},${intersect.length/relevantWiki.length},${relevantSparql.length},${relevantWiki.length},${intersect.length},${onlyInSparql.length},${onlyInWiki.length}`);
      //compareCSV.write('\r\n');

      //for writing as json

      let element = {
        queryID: item.queryID,
        query: item.query,
        sparql: item.sparql.query,
        fractionIntersectSparql:intersect.length/relevantSparql.length,
        fractionIntersectWiki:intersect.length/relevantWiki.length,
        relevantSparqlSize:relevantSparql.length,
        relevantWikiSize:relevantWiki.length,
        itersectionSize: intersect.length,
        onlyInSparqlSize: onlyInSparql.length,
        onlyInWikiSize: onlyInWiki.length
        //intersection: intersect.map(element => JSON.parse(element)),
        //onlyInSparql: onlyInSparql.map(element => JSON.parse(element)),
        //onlyInWiki: onlyInWiki.map(element => JSON.parse(element)),
      };
      compareJSON.write(JSON.stringify(element));
      compareJSON.write('\r\n');
    });
  });
}
