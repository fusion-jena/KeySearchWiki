import bunyan                             from 'bunyan';
import Config                             from './../config/config' ;
import ConfigExp                          from './../experiments/config' ;

/**
 * create logger objects (mostly for network error logging in file / pipeline progress )
 *
 *
 */

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

let cachePopLog = bunyan.createLogger({
  name: 'cache-population-progress',
  streams: [
    {
      level: 'info',
      path: Config.cachePopLog
    }
  ]
});

let wikipediaCachePopLog = bunyan.createLogger({
  name: 'wikipedia-cache-population-progress',
  streams: [
    {
      level: 'info',
      path: Config.wikipediaCachePopLog
    }
  ]
});

let downloadLog = bunyan.createLogger({
  name: 'download-progress',
  streams: [
    {
      level: 'info',
      path: Config.downloadLog
    }
  ]
});

let experPrep = bunyan.createLogger({
  name: 'data-preparation-experiments',
  streams: [
    {
      level: 'info',
      path: ConfigExp.experPrep
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
export {logNetworkError, logPipelineProgress, cachePopLog , wikipediaCachePopLog, downloadLog, experPrep};
