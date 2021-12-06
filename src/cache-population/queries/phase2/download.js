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

export default async function download(langs){

  console.log('File download started ...');
  downloadLog.info('File download started ...');

  // total to download
  let total = langs.length * Config.tables.length;

  let totalTemp = 0, failed = 0;

  mkdirp.sync(Config.dumpLocation);

  let errorLog = fs.createWriteStream(Config.downloadError, { flags: 'a' });

  const t0 = performance.now();

  for await (const lang of langs) {

    //download needed tables
    for await (const table of Config.tables){

      let link = Config.linkPrefix + lang + 'wiki' + '/' + Config.dumpDate + '/' + lang + 'wiki-' + Config.dumpDate + '-' + table;

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

  }

  const t1 = performance.now();

  downloadLog.info(`{time: ${(t1 - t0) / 1000}, failed:  ${failed}}`);
  console.log(`
  Time taken: ${(t1 - t0) / 1000} s
  Failed : ${failed}
  `);

}
