import Cache from '../../../util/cache';
import { logPipelineProgress as Log } from '../../../util/logger';

// setup cache
const cache = new Cache('qualifiers', 'iri') ;

export default function getQualifiers( entry ) {

  // Q59542487 ... "Wikimedia set category"
  if( !entry._isSetCat ) {
    return;
  }

  // get the qualifiers for P4224 ("contains")
  // traverse all wiki-sitelinks
  if( !('P4224' in entry.claims) ) {
    return;
  }
  const res = [];
  for( const claim of entry.claims['P4224'] ) {

    const claimRes = [];
    const target = claim.mainsnak.datavalue.value.id;

    // extract all qualifiers
    if( 'qualifiers' in claim ) {
      for(const qual of Object.values( claim.qualifiers ).flat() ) {

        // keywords are type dependent
        let keywordIRI;
        let isiri = false;
        switch( qual.datatype ) {
          case 'wikibase-item':
            keywordIRI = qual?.datavalue?.value?.id;
            isiri = true;
            break;
          case 'time':
            keywordIRI = qual?.datavalue?.value?.time;
            if(keywordIRI != undefined){
              if(keywordIRI.charAt(0) == '+'){
                keywordIRI = keywordIRI.substring(1);
              }
            }
            break;
          case 'quantity':
            keywordIRI = qual?.datavalue?.value?.amount;
            if(keywordIRI != undefined){
              if(keywordIRI.charAt(0) == '+'){
                keywordIRI = keywordIRI.substring(1);
              }
            }
            break;
          default:
            Log.error( `getQualifiers: ${JSON.stringify(qual)}` );
        }

        // assemble entry
        keywordIRI = keywordIRI || undefined;
        claimRes.push({
          keywordIRI, isiri, target,
        });

      }
    }

    // default entry, if there is no qualifiers
    // simulating the OPTIONAL from SPARQL
    if( claimRes.length < 1 ) {
      res.push({ target });
    }

    // append all solutions for this target
    res.push( ... claimRes );

  }

  // persist
  cache.setValues([{ iri: entry.id, result: res }]);

}
