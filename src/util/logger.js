import bunyan                             from 'bunyan';
import Config                             from './../config/config' ;
import mkdirp                             from 'mkdirp';

/**
 * create logger objects (mostly for network error logging in file / pipeline progress )
 *
 *
 */

// create folder where to store gold standard file , logs ...
mkdirp.sync(Config.outputGS);

let logNetworkError = bunyan.createLogger({
  name: 'log-network-error',
  streams: [
    {
      level: 'error',
      path: Config.apiErrorLog
    }
  ]
});

let logPipelineProgress = bunyan.createLogger({
  name: 'pipeline-progress',
  streams: [
    {
      level: 'info',
      path: Config.pipelineLog
    }
  ]
});

/*let logWikipediaHit = bunyan.createLogger({
  name: 'wikipedia-hits',
  streams: [
    {
      level: 'info',
      path: Config.wikipediaHitLog
    }
  ]
});*/
export {logNetworkError, logPipelineProgress};
