import plotMetricFrequency              from './../plots/plotMetricFrequency';
import plotMetricFrequencyBinned        from './../plots/plotMetricFrequencyBinned';
import Config                           from './../config/config';


(async function(){

  console.log('Generating Plots . . .');

  plotMetricFrequency('relevantEntitiesSize','log', 'black', Config.metricDatasetFinal , '#RE');
  plotMetricFrequency('nrKeyword','linear', 'blue', Config.metricDatasetFinal , '#Concepts');
  plotMetricFrequencyBinned('coverage', 'green',1,0.2, Config.metricDatasetFinal, 'coverage', '#final-entries', 'cov', 40);
  plotMetricFrequencyBinned('Precision', 'blue',1,0.1, Config.eval + 'compare.json', 'Precision', '#queries', 'x', 25);
  plotMetricFrequencyBinned('Recall', 'green',1,0.1, Config.eval + 'compare.json', 'Recall', '#queries', 'x', 25);
})();
