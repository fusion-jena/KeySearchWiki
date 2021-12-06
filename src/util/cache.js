import Sqlite3 from 'better-sqlite3';
import Config from './../config/config';
import mkdirp from 'mkdirp';
import Path   from 'path';
import Fs     from 'fs';

/*
 * object representing cache based on SQLite3
 * if languages are used, caches are split across files
 */
export default class Cache {

  /**
   * @param     {String}      name          representative name of cache
   * @param     {String}      variable      name of key that would be used as key in cache table
   *
   */
  constructor(name, variable ) {

    // memorize parameters
    this._name = name;
    this._variable = variable;

    // make sure the cache folder exists
    mkdirp.sync(Config.cachePath);

    // prepare some queries
    this._insertValues = `
      INSERT OR REPLACE INTO cache (${variable}, resultString)
      VALUES (:${variable}, :resultString)
      `;
    this._select = `
      SELECT ${this._variable}, resultString
      FROM cache
      `;

  }

  /**
   * get a reference to the appropriate cache database
   *
   * @param {String} lang
   */
  getDb( lang ) {

    // path to the cache file
    const path = lang
      ? Path.join( Config.cachePath, this._name, `${lang}.db` )
      : Path.join( Config.cachePath, `${this._name}.db` );

    // open the database and memorize whether it already existed
    const newDb = !Fs.existsSync( path );
    if( newDb ) {
      mkdirp.sync( Path.dirname( path ) );
    }
    const db = new Sqlite3( path );

    // initialize, if it was a new database
    if( newDb ) {
      // create table if not exist
      db.prepare(`
        CREATE TABLE IF NOT EXISTS cache (
          ${this._variable} TEXT NOT NULL ,
          resultString TEXT DEFAULT NULL ,
          PRIMARY KEY (${this._variable})
        );
        `).run();
    }

    return db;

  }


  selectValues(nrVals) {
    return `
      SELECT ${this._variable}, resultString
      FROM cache
      WHERE ${this._variable} IN (${nrVals})
    `;
  }


  getAll( lang ) {

    // open database
    const db = this.getDb( lang );
    const resp = db.prepare(this._select).all();

    // parse results
    return resp.map(row => {
      return { [this._variable]: row[this._variable], result: JSON.parse(row.resultString) };
    });

  }


  getValues(vals, lang ) {

    const resp = { hits: [], misses: [] };
    const select = [];

    // prepare database
    const db = this.getDb( lang );

    // select in batch sizes of 32766 from SQLite (Maximum Number Of Host Parameters In A Single SQL Statement)
    for (let j = 0; j < vals.length; j += Config.cacheMaxValuesSQLite) {

      // prepare query
      const slice = vals.slice(j, j + Config.cacheMaxValuesSQLite);
      const nrVals = slice.map( () => '?' ).join( ', ' );
      const query = this.selectValues(nrVals);

      // run query
      select.push( ... db.prepare(query).all(slice) );

    }

    // add found
    const visited = new Set();
    select.forEach(row => {
      resp.hits.push({ [this._variable]: row[this._variable], result: JSON.parse(row.resultString) });
      visited.add(row[this._variable]);
    });



    // add missing if endpoint enabled
    if(Config.endpointEnabled){
      vals.forEach(item => {
        if (!visited.has(item)) {
          resp.misses.push(item);
        }
      });
    }

    return resp;

  }


  setValues( results, lang ) {

    // map to parameters sent via query
    const inserts = results.map(item => ({
      [this._variable]: item[this._variable],
      resultString:     JSON.stringify(item.result)
    }) );

    // open database
    const db = this.getDb( lang );

    // prepare query/ies
    const insert = db.prepare(this._insertValues);
    const insertMany = db.transaction((items) => {
      for (const item of items)
        insert.run(item);
    });

    // run everything
    insertMany(inserts);

  }

  // instead of returning every row together, an iterator is returned so we can retrieve the rows one by one.
  getIterator(lang){
    const db = this.getDb( lang );
    const stmt = db.prepare(this._select);
    return stmt.iterate();
  }

}
