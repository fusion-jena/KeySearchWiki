import Config                        from './../../config/config';
import {logNetworkError}             from './../logger';

/**
 * Issue queries to SPARQL Endpoint
 *
 * - limit requests to a maximum of X parallel requests
 * see : https://www.mediawiki.org/wiki/Wikidata_Query_Service/User_Manual
 * @param {String}    endpoint        the endpoint to establish the pool for
 * @param {Number}    maxRequests     maximum number of requests issued in parallel
 */

export default function createRequestPool( endpoint = Config.endpoint, maxRequests = Config.maxParallelQueries) {

  // endpoint has to be set
  if( !endpoint ) {
    throw new Error( 'endpoint is a mandatory parameter!' );
  }

  // if called as a constructor, redirect to function call
  if( new.target ) {
    return createRequestPool( endpoint, maxRequests = Config.maxParallelQueries);
  }

  // current queue
  const queue = [];

  // currently running requests
  const requests = new Set();

  // try to execute a new request
  async function execReq() {

    // if we are already at max or there is nothing left, don't do anything
    if( (requests.size > maxRequests) || (queue.length < 1) ) {
      return;
    }

    // start new request
    const req = queue.shift();
    try {

      // trigger before
      if( ('options' in req) && req.options && ('before' in req.options) ){
        req.options.before( req );
      }

      // add to active requests
      requests.add( req );

      if(req.leftRetries <= 0){
        req.reject( new Error( 'limit # of query retries reached ! ' ) );
        return ;
      }

      // get response
      const res = await fetch( endpoint, {
        method: 'POST',
        headers: {
          'User-Agent': 'kwsearch-goldstandard-generation-wikidata/1.0.0',
          'Content-type': 'application/x-www-form-urlencoded',
          'Accept':       'application/sparql-results+json',
        },
        body: req.query
      });

      // check, if it was successful
      if( res.status != 200 ) {
        let text = await res.text();

        if(text.includes('\njava.util.concurrent.TimeoutException\n\tat')){
          // TODO: sometimes queries can timeout in one try and not in other , also consider retrying
          logNetworkError.error({text: 'timeout', function: 'execReq' , request: `${req.query}` , leftRetries: 0 });
          req.reject(new Error('timeout'));
          return ;
        }

        //write error in log together with query
        logNetworkError.error({status: `${res.status}`, statusText: `${res.statusText}`, function: 'execReq' , request: `${req.query}` , leftRetries: `${req.leftRetries}`});

        // Error: 429, Scripted requests from your IP have been blocked, retry
        if((res.status == 429) || (res.status >= 500)){
          // get delay
          let delay ;
          if(res.headers.hasOwnProperty('Retry-After')){
            delay = res.headers['Retry-After'];
          }
          else{
            delay = Config.defaultDelay ;
          }

          // reduce the load by delaying the execution
          await new Promise(resolve => setTimeout(resolve, delay*1000));

          //retry
          req.leftRetries -- ;
          queue.push(req);
          return execReq();
        }

        else{
          req.reject( new Error(text) );
          return;
        }

      }

      // parse it
      const data = await res.json();

      // result format depends on the query type
      let result;
      switch( true ) {

        // ASK queries
        case ('boolean' in data) && !('results' in data):
          result = data.boolean;
          break;

          // SELECT queries
        case ('results' in data):
          // flatten result
          result = data.results.bindings.map( (b) => {
            return Object.keys( b )
              .reduce( (all, key) => {

                // parse value to correct type, if possible
                let val;
                switch( b[key].datatype ) {
                  case 'http://www.w3.org/2001/XMLSchema#decimal':
                    val = parseFloat( b[key].value );
                    break;
                  case 'http://www.w3.org/2001/XMLSchema#integer':
                    val = parseInt( b[key].value );
                    break;
                  default:
                    val = b[key].value;
                }

                return {
                  ... all,
                  [key]: val,
                };
              }, {});
          });
          break;
      }

      // trigger before
      if( ('options' in req) && req.options && ('after' in req.options) ){
        req.options.after( result );
      }

      // relay
      req.fulfill( result );

      // remove from active list
      requests.delete( req );

      // schedule the next one
      setTimeout( execReq, 10 );

    } catch( e ) {

      if(e.code == 'ECONNREFUSED' || e.code == 'ECONNRESET' || e.code == 'ETIMEDOUT' || e.code == 'EAI_AGAIN' || e.code == 'EHOSTUNREACH'){
        //write error in log together with query
        logNetworkError.error({errorCode: `${e.code}`, errorMessage: `${e.message}`, function: 'execReq' , request: `${req.query}` , leftRetries: `${req.leftRetries}`});
        // reduce the load by delaying the execution
        await new Promise(resolve => setTimeout(resolve, Config.defaultDelay*1000));

        //retry ;
        req.leftRetries -- ;
        queue.push(req);
        return execReq();
      }

      if(e.message.includes('invalid json response body')){
        logNetworkError.error({errorMessage: `${e.message}`, function: 'execReq' , request: `${req.query}` , leftRetries: 0});
        req.reject(new Error('invalid-json'));
        return ;
      }

      else{
        // relay errors
        req.reject( e );
      }

    }

  }

  /*
    * function to call for actual requests
    * @param   {String}    queryString       SPARQL query to be sent
    * @param   {Object}    [options]         generic options; includes lifecycle callbacks
    * @param   {Function}  [options.before]  callback at the start of processing the request
    * @param   {Function}  [options.after]   callback at the end of processing the request
    */
  return  async function queryEndpoint( queryString, options, leftRetries = Config.maxRetries ) {

    // create the queue
    const query = 'query=' + encodeURIComponent(queryString);

    //for now queries (sparql queries attached to categories) that timeout are skipped (we noticed that for queries that timeout, the fetch function sometimes returns invalid json )
    let skipReason ;

    // try to execute
    let promise =  new Promise( (fulfill, reject) => {

      try {
        // add to queue
        queue.push({
          query, fulfill, reject ,options, leftRetries
        });
        // trigger execution
        execReq();

      } catch( e ) {
        reject( e );
      }

    });

    await promise.catch(e => {
      if(e.message == 'invalid-json' || e.message == 'timeout'){
        skipReason = 'timeout' ;
      }
      else {
        throw e ;
      }
    });

    if(skipReason == undefined){
      return promise ;
    }
    else{
      return {skipReason: skipReason , query: queryString};
    }

  };

}
