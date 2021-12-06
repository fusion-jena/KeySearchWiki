import Cache   from './../../../util/cache';
import Config  from './../../config';
import fs      from 'fs';
import urlAccessCheck from './../../../util/urlAccessCheck';

/**
 * from cat_titles_langs from categories titles by language , filter out languages that are not accessible
 *
 * @param {Set}     exclude        categories without target or with multi-target
 * @param {Object}  catToTarget    non excluded categories with target iri -> target
 */

export default async function groupByLang(exclude , catToTarget){

  let langListFile = fs.createWriteStream(Config.wikidataDumpLangList, { flags: 'a' });
  let catGroupedBylang = fs.createWriteStream(Config.catGroupedBylang , { flags: 'a' });

  let langList = {noApi: [], noDownload : [] , both: []};

  let grouped = {};

  //setup cache
  const cache = new Cache( 'cat_titles_langs', 'catIRI' );

  console.log('Group categories by language . . .');
  //get all content
  let resp = cache.getAll();

  resp.forEach(cat => {
    if(!exclude.has(cat.catIRI)){
      cat.result.forEach(item => {
        if(item.hasOwnProperty('title') && item.hasOwnProperty('lang')){
          if(item.lang in grouped){
            grouped[item.lang].push({title:item.title, target:catToTarget[cat.catIRI]});
          }
          else{
            grouped[item.lang] = [{title:item.title, target:catToTarget[cat.catIRI]}];
          }
        }
      });
    }
  });

  console.log('Check if API and download link are accessible . . .');

  for await (const lang of Object.keys(grouped)) {

    //console.log(lang);

    let respApi, respDownload;

    // check if api exists
    let link = `https://${lang}.wikipedia.org/w/api.php`;
    respApi = await urlAccessCheck(link);

    if(respApi == 'ENOTFOUND'){
      delete grouped[lang];
      langList.noApi.push(lang);
      continue;
    }

    // check if download link exists for all tables
    let download = true ;

    for await (const table of Config.tables){

      //console.log(table);

      let link = Config.linkPrefix + lang + 'wiki' + '/' + Config.dumpDate + '/' + lang + 'wiki-' + Config.dumpDate + '-' + table;
      respDownload = await urlAccessCheck(link);

      if(respDownload == 'ENOTFOUND'){
        delete grouped[lang];
        langList.noDownload.push(lang);
        download = false;
        break;
      }
    }

    if(download){
      langList.both.push(lang);
    }

  }

  langListFile.write(JSON.stringify(langList));
  catGroupedBylang.write(JSON.stringify(grouped));

  //console.log(langList);

  return {grouped: grouped , langList: langList};

}
