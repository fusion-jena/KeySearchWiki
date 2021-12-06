import urlAccessCheck from './../util/urlAccessCheck';
import Config         from './../config/config';
import CacheConfig    from './../cache-population/config';
import fs             from 'fs';

/**
 * filter out languages that are not accessible
 * @param     {Array}     wikipTitleLang       result of getWikiTitleLang
 * @returns   {Object}    contains a list of langagues where api check/download check fails in addition to a list of languages that pass both tests
 *
 */

export default async function checkLangAccess(wikipTitleLang) {

  let langListFile = fs.createWriteStream(Config.outputGS + 'lang-list.json', { flags: 'a' });

  let langList = {noApi: [], noDownload : [] , accepted: []};

  console.log('Gather languages . . .');

  let langs = new Set();

  wikipTitleLang.forEach(cat => {
    cat.result.forEach(item => {
      if(item.hasOwnProperty('title') && item.hasOwnProperty('lang')){
        langs.add(item.lang);
      }
    });
  });

  console.log('Check if API and download link are accessible . . .');

  for await (const lang of [... langs]) {

    let respApi, respDownload;

    // check if api exists
    let link = `https://${lang}.wikipedia.org/w/api.php`;
    respApi = await urlAccessCheck(link);

    if(respApi == 'ENOTFOUND'){
      langList.noApi.push(lang);
      continue;
    }

    // check if download link exists for all tables
    let download = true ;

    for await (const table of CacheConfig.tables){

      //console.log(table);

      let link = CacheConfig.linkPrefix + lang + 'wiki' + '/' + CacheConfig.dumpDate + '/' + lang + 'wiki-' + CacheConfig.dumpDate + '-' + table;
      respDownload = await urlAccessCheck(link);

      if(respDownload == 'ENOTFOUND'){
        langList.noDownload.push(lang);
        download = false;
        break;
      }
    }

    if(download){
      langList.accepted.push(lang);
    }

  }

  langListFile.write(JSON.stringify(langList));

  //console.log(langList);

  return langList;


}
