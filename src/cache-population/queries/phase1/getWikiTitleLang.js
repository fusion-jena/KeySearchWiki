import Cache from '../../../util/cache';

// setup cache
const cache = new Cache( 'cat_titles_langs', 'catIRI' );

// some entries need to be excluded manually
// there seems to be no way to determine that from the dump
const BLACKLIST = new Set([ 'commonswiki', 'specieswiki', 'metawiki', 'sourceswiki' ]);

export default function getWikiTitleLang( entry ) {

  // Q59542487 ... "Wikimedia set category"
  if( !entry._isSetCat ) {
    return;
  }

  // traverse all wiki-sitelinks
  if( !('sitelinks' in entry) ) {
    return;
  }
  const sitelinks = Object.keys( entry.sitelinks )
    .filter( (k) => k.endsWith('wiki') )
    .filter( (k) => !BLACKLIST.has( k ) );
  const res = [];
  for( const lang of sitelinks ) {
    const link = entry.sitelinks[ lang ];
    res.push({
      title: link.title,
      lang: lang.replace( /wiki$/i, '' ),
    });
  }

  // persist
  if(res.length > 0){
    cache.setValues([{ catIRI: entry.id, result: res }]);
  }
  else{
    cache.setValues([{ catIRI: entry.id, result: [{}] }]);
  }

}
