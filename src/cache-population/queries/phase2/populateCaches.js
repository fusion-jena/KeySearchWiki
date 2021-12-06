import Config    from './../../config';
import fs        from 'fs';
import MariaDB   from './mariaDB';
import typeCheck from './typeCheck';
import Cache     from './../../../util/cache';
import { wikipediaCachePopLog }    from './../../../util/logger';

const { performance } = require('perf_hooks');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

/**
 * import sql dump tables and populate wikipedia caches
 * perform a BFS search to populate wikipedia members cache
 * @param {Object}  grouped    object of lang => category list
 *
 */

export default async function populateCaches(grouped){

  let start = performance.now();

  let errorLog = fs.createWriteStream(Config.importError, { flags: 'a' });
  let timeLog = fs.createWriteStream(Config.timeLog, { flags: 'a' });

  // initialize connexion to wikipedia database
  let mariadb = new MariaDB();
  let conn = await mariadb.connect();

  //initialize caches
  let cacheWikipMembers = new Cache('wikipedia_page_members', 'catTitle') ;
  let cacheWikipIDs = new Cache('wikipedia_page_wikidataID', 'pageid' );

  //console.log('Cache population started . . .');
  wikipediaCachePopLog.info('Cache population started . . .');

  let langs = Object.keys(grouped);

  // for progress tracking
  let tempNlang = 1 ;
  let numberLangs = langs.length;

  for (let lang of langs) {
    // for each language
    //drop old tables, create new tables and load sql dump
    //console.log(`-> ${lang}:`);
    wikipediaCachePopLog.info(`-> ${lang}:`);
    let t0 = performance.now();
    if(lang != 'en'){
      for(let table of Config.tables){
        const { stdout } = await exec(`zcat ${Config.preImport} ${Config.dumpLocation}${lang}/${lang}wiki-${Config.dumpDate}-${table} ${Config.postImport} | mysql -u '${Config.user}' -p${Config.password} ${Config.databaseName}`);
        if(stdout == ''){
        //console.log(`   ${table} imported !`);
          wikipediaCachePopLog.info(`   ${table} imported !`);
        }
        else{
        //console.log(stdout);
          errorLog.write(`{lang:${lang}, table:${table}, error:${stdout} }`);
          errorLog.write('\r\n');
        }
      }


      let t1 = performance.now();
      timeLog.write(`{action: import , lang: ${lang}, time: ${(t1 - t0) / 1000}}`);
      timeLog.write('\r\n');
    }

    // for progress tracking
    let numberCats = grouped[lang].length;
    let tempNCats = 1 ;


    // BFS through categories hierarchy
    for await (let title of grouped[lang]){

      let t2 = performance.now();
      let target = title.target ;

      wikipediaCachePopLog.info(`-> initial cat: ${title.title} , target: ${target}`);
      //console.log(`-> initial cat -> ${title.title}`);

      //format title in way stored in wikipedia dump
      let split = title.title.split(':');
      let prefix = split.shift();
      let formated = split.join(':').split(' ').join('_');

      let catsPool = [formated];
      let visited = [formated];

      while(catsPool.length > 0){

        let currentCat = catsPool.pop();

        wikipediaCachePopLog.info(`   - ${currentCat}`);
        //console.log(`   - ${currentCat}`);

        let members = await mariadb.getCatMembers(conn, conn.escape(currentCat));

        wikipediaCachePopLog.info(`    #members- ${members.length}`);
        //console.log(`   #members- ${members.length}`);

        let pageidsSubCat = [], pageidspage = [] , pageidsMainpage = [], res = [], idToTitel = {};

        if(members.length > 0){

          members.forEach(el => {
            if(el.cl_type.toString() == 'subcat'){
              pageidsSubCat.push(el.cl_from);
            }
            if(el.cl_type.toString() == 'page'){
              pageidspage.push(el.cl_from);
            }
          });

          if(pageidspage.length > 0){

          //allow only pageids of namespace = 0 => main page (noticed that also e.g., ns = 10 is considered as 'page')
            let namespaces = await mariadb.getNS(conn, pageidspage);

            namespaces.forEach(ns => {
              if(ns.page_namespace == 0){
                pageidsMainpage.push(ns.page_id);
              }

            });
          }

          wikipediaCachePopLog.info(`      #main-pages- ${pageidsMainpage.length}`);
          wikipediaCachePopLog.info(`      #other-pages- ${pageidspage.length - pageidsMainpage.length}`);
          //console.log(`     #pages- ${pageidsMainpage.length}`);
          //console.log(`     #other-pages- ${pageidspage.length - pageidsMainpage.length}`);

          wikipediaCachePopLog.info(`      #subcat- ${pageidsSubCat.length}`);
          //console.log(`     #subcat- ${pageidsSubCat.length}`);

          // if we have subcategories and/or main pages
          if(pageidsMainpage.length + pageidsSubCat.length > 0){

            //for subcategories ids get titles
            if(pageidsSubCat.length > 0){

              let titles = await mariadb.getTitles(conn, pageidsSubCat);

              titles.forEach(itm => {
                idToTitel[itm.page_id] = itm.page_title.toString();
              });
            }

            // transform to sqlite cache format for members
            pageidsMainpage.forEach(id => {
              let entry = {pageid: id};
              entry['ns'] = 0;
              res.push(entry);
            });

            pageidsSubCat.forEach(id => {
              // there are some subcategories without title , e.g., pageid 65256019 in en
              if(idToTitel[id] != undefined){
                let entry = {pageid: id};
                entry['ns'] = 14;
                let title = idToTitel[id].split('_').join(' ');
                entry['title'] = `${prefix}:${title}`;
                res.push(entry);
              }
            });


            let resp = {catTitle: `${prefix}:${currentCat.split('_').join(' ')}`, result: res};

            cacheWikipMembers.setValues([resp], lang );

            //store pages and their wikidata id in corresponding sqlite cache

            if(pageidsMainpage.length > 0){

              let wikidataIDs = await mariadb.getWikidataIDs(conn, pageidsMainpage);

              let resWikiIDs = [];

              wikidataIDs.forEach(item => {
                resWikiIDs.push({pageid: item.pp_page.toString(), result: item.pp_value.toString()});
              });

              cacheWikipIDs.setValues(resWikiIDs, lang);

              // add page ids without wikidata id
              let ids = new Set();

              resWikiIDs.forEach(item => {
                ids.add(Number(item.pageid));
              });

              let difference = [];

              pageidsMainpage.forEach(item => {
                if(!ids.has(item)){
                  difference.push(item);
                }
              });

              if( difference.length > 0){
                wikipediaCachePopLog.info(`pageids without wikidataID exist: e.g., ${difference[0]}, number:${difference.length}`);
                cacheWikipIDs.setValues(difference.map(e => {return {pageid: e.toString(), result:''};}), lang);
              }

              //gather wikidata iris
              let irisSet = new Set();

              resWikiIDs.forEach(row => {
                irisSet.add(row.result);
              });

              //perform type check
              let check = typeCheck(target , [... irisSet]);

              if(check.bool){wikipediaCachePopLog.info(`  fraction : ${check.fraction} |  type check succeeded ! <added cats : ${pageidsSubCat.length}>`);} else{
                wikipediaCachePopLog.info(`  fraction : ${check.fraction} |  type check failed ! <not added cats : ${pageidsSubCat.length}>`);
              }

              if(check.bool){
                if(pageidsSubCat.length > 0){

                  // add subcategory title to queue and avoid loops
                  Object.values(idToTitel).forEach(value => {
                    if (!visited.some(item => item === value)){
                      visited.push(value);
                      catsPool.push(value);
                    }
                  });
                }
              }
            }

            if(pageidsMainpage.length == 0){
              // add subcategory title to queue and avoid loops
              Object.values(idToTitel).forEach(value => {
                if (!visited.some(item => item === value)){
                  visited.push(value);
                  catsPool.push(value);
                }
              });
            }

          }

          if(pageidsMainpage.length + pageidsSubCat.length == 0){
            let response = {catTitle: `${prefix}:${currentCat.split('_').join(' ')}`, result: res};
            cacheWikipMembers.setValues([response], lang );
          }

        }

        if(members.length == 0){
          let response = {catTitle: `${prefix}:${currentCat.split('_').join(' ')}`, result: res};
          cacheWikipMembers.setValues([response], lang );
        }

      }

      let t3 = performance.now();
      timeLog.write(`{action: BFS , initialCat: ${title.title}, time: ${(t3 - t2) / 1000}, visited: ${visited.length}}`);
      timeLog.write('\r\n');

      console.log(`(${tempNlang})<${lang}> : ${tempNCats}/${numberCats} initial categories done !`);
      tempNCats ++;
    }

    console.log(`${tempNlang}/${numberLangs} languages done !`);
    tempNlang ++;

  }
  //close connection
  await mariadb.close(conn);

  let end = performance.now();

  timeLog.write(`{totalTime: ${(end - start) / 1000}}`);

}
