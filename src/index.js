const DeterministicClassifier = require('./classifier/determinist-classifier');
const FourLayerDedup = require('./dedup/four-layer-dedup');
const ProblemRepository = require('./repositories/problem-repository');

module.exports = {
  DeterministicClassifier,
  FourLayerDedup,
  ProblemRepository,
};

module.exports.default = module.exports;
