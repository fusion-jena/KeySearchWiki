import Config  from './../../config';
import mkdirp  from 'mkdirp';
import fs      from 'fs';
import https   from 'https';
import { downloadLog }    from './../../../util/logger';

const { performance } = require('perf_hooks');

/**
 * download specific sql dump tables for all languages given as input
 *
 * @param {Array}  langs    list of languages
 *
 */


let totalTemp = 0, failed = 0;

export default async function downloadAll(langs){

  console.log('File download started ...');
  downloadLog.info('File download started ...');

  // total to download
  let total = langs.length * Config.tables.length;

  mkdirp.sync(Config.dumpLocation);

  let errorLog = fs.createWriteStream(Config.downloadError, { flags: 'a' });

  const t0 = performance.now();

  for await (const lang of langs) {

    //download needed tables
    for await (const table of Config.tables){

      let link = Config.linkPrefix + lang + 'wiki' + '/' + Config.dumpDate + '/' + lang + 'wiki-' + Config.dumpDate + '-' + table;

      await downloadOne(link, lang, table, total, errorLog);

    }

    // reduce the load by delaying the execution
    await new Promise(resolve => setTimeout(resolve, 5*1000));
  }

  const t1 = performance.now();

  downloadLog.info(`{time: ${(t1 - t0) / 1000}, failed:  ${failed}}`);
  console.log(`
  Time taken: ${(t1 - t0) / 1000} s
  Failed : ${failed}
  `);

}

/**
 * function to download one file with retry
 *
 */
async function downloadOne(link, lang, table, total, errorLog, leftRetries = Config.maxRetries){

  if(leftRetries <= 0){
    throw 'limit # of query retries reached ! ' ;
    return ;
  }

  try{
    await new Promise (resolve=> {

      https.get(link, res => {
        if(res.statusCode == 200){
        // create language folder
          mkdirp.sync(Config.dumpLocation + lang);
          const path = Config.dumpLocation + lang + '/' +  lang + 'wiki-' + Config.dumpDate + '-' + table;
          const filePath = fs.createWriteStream(path);
          res.pipe(filePath).on('finish',() => {
            filePath.close();
            totalTemp ++ ;
            downloadLog.info(`${totalTemp} / ${total} files , downloaded ! (${lang})`);
            console.log(`${totalTemp} / ${total} files , downloaded ! (${lang})`);
            resolve();
          });
        }
        else {
          errorLog.write(`{lang: ${lang} , link: ${link} , statusCode: ${res.statusCode}}`);
          errorLog.write('\r\n');
          failed ++;
          resolve();
        }
      });

    });
  }
  catch(e){
  //if some network failure occurs, retry
    if (e.code == 'ECONNREFUSED' || e.code == 'ECONNRESET' || e.code == 'ETIMEDOUT' || e.code == 'EAI_AGAIN' || e.code == 'EHOSTUNREACH') {
      failed ++;
      //write error in log together with query
      errorLog.write(`{ errorCode: ${e.code}, errorMessage: ${e.message}, lang: ${lang} , link: ${link} , leftRetries: ${leftRetries}}`);
      errorLog.write('\r\n');
      // reduce the load by delaying the execution
      await new Promise(resolve => setTimeout(resolve, Config.defaultDelay * 1000));
      //retry ;
      return await downloadOne(link, lang, table, total, errorLog, leftRetries - 1);
    }

    else {
      console.log(e);
      return;
    }
  }
}
