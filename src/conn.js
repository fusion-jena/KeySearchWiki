import Connection from './util/wikidata/ThrottledRequests';
import Config     from './config/config';


import 'cross-fetch/polyfill';

/**
 * provide a common connection to endpoint
 * so we do not flood endpoint with our requests
 */
export default Connection( Config.endpoint );
