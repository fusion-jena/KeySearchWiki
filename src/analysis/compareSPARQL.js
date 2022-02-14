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

  console.log('Compare SPARQL/Wikipedia . . .');

  // sparql queries that do not correspond to relevant entities need
  // gathered manually, will not be taken into consideration

  let remove = ['NT2208'];

  let stream = fs.createReadStream(Config.datasetNative , {encoding: 'utf8'});

  let parser = JSONStream.parse('*');
  stream.pipe(parser);

  let sparql = [];

  parser.on('data', entry => {
    if(entry.sparql != '' && entry.sparql.result[0]?.item != 'timeout' && entry.sparql.result[0]?.item != undefined){
      sparql.push(entry);
    }
  });

  parser.on('end', () => {

    //let compareCSV = fs.createWriteStream(Config.eval+'compare.csv', {flags: 'a'});
    let compareJSON = fs.createWriteStream(Config.eval+'compare.json', {flags: 'a'});
    let compareStats = fs.createWriteStream(Config.eval+'statistics-compare.json', {flags: 'a'});

    let fractionIntersectSparqlSumm = 0, fractionIntersectWikiSumm = 0 ;
    //compareCSV.write('queryID,query,sparql,intersection/sparqlSize,intersection/wikiSize,sparqlSize,wikiSize,intersection,onlyInSparql,onlyInWiki');
    //compareCSV.write('\r\n');

    sparql.forEach(item => {

      if(!remove.some(id => id == item.queryID)){

      let relevantSparql = item.sparql.result.map(element => {return JSON.stringify({iri:element.item , label:element.itemLabel});});
      let relevantWiki = item.relevantEntities.map(element => JSON.stringify(element));
      let intersect = _.intersection(relevantSparql, relevantWiki);
      let onlyInSparql = _.difference(relevantSparql, relevantWiki);
      let onlyInWiki =  _.difference(relevantWiki, relevantSparql);

      //compareCSV.write(`${item.queryID},${item.query},${item.sparql.query},${intersect.length/relevantSparql.length},${intersect.length/relevantWiki.length},${relevantSparql.length},${relevantWiki.length},${intersect.length},${onlyInSparql.length},${onlyInWiki.length}`);
      //compareCSV.write('\r\n');

      //for writing as json

      let fractionIntersectSparql = intersect.length/relevantSparql.length;
      let fractionIntersectWiki = intersect.length/relevantWiki.length;

      fractionIntersectSparqlSumm +=  fractionIntersectSparql ;
      fractionIntersectWikiSumm += fractionIntersectWiki ;

      let element = {
        queryID: item.queryID,
        query: item.query,
        sparql: item.sparql.query,
        Recall:fractionIntersectSparql,
        Precision:fractionIntersectWiki,
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
     }
    });

    let averageIntersectSparql = fractionIntersectSparqlSumm / (sparql.length - remove.length);
    let averageIntersectWiki = fractionIntersectWikiSumm / (sparql.length - remove.length);

    compareStats.write(JSON.stringify({averageRecall:averageIntersectSparql, averagePrecision: averageIntersectWiki}));
  });
}
