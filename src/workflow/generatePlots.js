import plotMetricFrequency              from './../plots/plotMetricFrequency';
import plotMetricFrequencyBinned        from './../plots/plotMetricFrequencyBinned';
import Config                           from './../config/config';


(async function(){

  console.log('Generating Plots . . .');

  plotMetricFrequency('relevantEntitiesSize','log', 'black', Config.metricDatasetFinal , '#RE');
  plotMetricFrequency('nrKeyword','linear', 'blue', Config.metricDatasetFinal , '#Terms');
  plotMetricFrequencyBinned('coverage', '#83E086',1,0.2, Config.metricDatasetFinal);
  plotMetricFrequencyBinned('coverage', 'green',1,0.2, Config.metricDatasetFinal, 'coverage', '#final-entries', 'cov', 40);
  plotMetricFrequencyBinned('fractionIntersectWiki', 'blue',1,0.1, Config.eval + '.json', 'x = intersect / #RE', '#native-entries', 'x', 25);
  plotMetricFrequencyBinned('fractionIntersectSparql', 'green',1,0.1, Config.eval + '.json', 'x = intersect / #SPARQL', '#native-entries', 'x', 25);

})();
