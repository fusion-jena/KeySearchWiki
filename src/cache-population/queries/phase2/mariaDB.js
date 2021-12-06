import mariadb from 'mariadb';
import Config  from './../../config';

/*
 * object to initialize connection to Mariadb database and issue some queries
 *
 */

export default class MariaDB {

  /*
   * connect to mariadb database
   *
   */

  connect() {
    try {
      const connect = mariadb.createConnection({
        user: Config.user ,
        password: Config.password,
        database: Config.databaseName
      });
      return connect;
    }
    catch(err){
      throw err ;
    }
  }

  /**
   * close connection
   *
   * @param {Promise}  conn        connection to database
   *
   */

  close(conn){
    try{
      conn.end();
    }
    catch(err){
      throw err ;
    }
  }

  /**
   * get category members
   *
   * @param {Promise}  conn        connection to database
   * @param {String}   catTitle    titel of category
   */

  getCatMembers( conn , catTitle ) {

    let query = `SELECT cl_from , cl_type FROM categorylinks WHERE cl_to = ${catTitle}`;
    return conn.query(query);
  }

  /**
   * get category titles from ids
   *
   * @param {Promise}  conn        connection to database
   * @param {Array}    pageids     array of page ids
   */

  async getTitles( conn , pageids ) {
    const select = [];
    for (let j = 0; j < pageids.length; j += Config.maxValues) {
      const slice = pageids.slice(j, j + Config.maxValues);
      let values= JSON.stringify(slice).replace('[', '').replace(']', '');
      let query = `SELECT page_title , page_id FROM page WHERE page_id IN (${values})`;
      select.push(... await conn.query(query));
    }

    return select;
  }

  /**
   * get page namespaces from ids
   *
   * @param {Promise}  conn        connection to database
   * @param {Array}    pageids     array of page ids
   */

  async getNS( conn , pageids ) {
    const select = [];
    for (let j = 0; j < pageids.length; j += Config.maxValues) {
      const slice = pageids.slice(j, j + Config.maxValues);
      let values= JSON.stringify(slice).replace('[', '').replace(']', '');
      let query = `SELECT page_namespace , page_id FROM page WHERE page_id IN (${values})`;
      select.push(... await conn.query(query));
    }

    return select;

  }

  /**
   * get wikidata ids for pageids
   *
   * @param {Promise}  conn        connection to database
   * @param {Array}    pageids     array of page ids
   */

  async getWikidataIDs( conn , pageids ) {
    const select = [];
    for (let j = 0; j < pageids.length; j += Config.maxValues) {
      const slice = pageids.slice(j, j + Config.maxValues);
      let values= JSON.stringify(slice).replace('[', '').replace(']', '');
      let query = `SELECT pp_page , pp_value FROM page_props WHERE pp_page IN (${values}) and pp_propname = 'wikibase_item'`;
      select.push(... await conn.query(query));
    }

    return select;
  }

}
