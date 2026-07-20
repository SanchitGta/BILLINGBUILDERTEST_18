// Data-access helper for data.json. Feature/Subscription shapes follow the PRD data model (section 5).
const fs = require('fs');
const path = require('path');

const DATA_PATH = process.env.DATA_FILE || path.join(__dirname, 'data.json');

function readData() {
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
}

function writeData(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

function getFeature(featureId) {
  return readData().features[featureId] || null;
}

function saveFeature(feature) {
  const data = readData();
  data.features[feature.featureId] = feature;
  writeData(data);
  return feature;
}

function getSubscription(featureId, orgId) {
  const data = readData();
  return (
    Object.values(data.subscriptions).find(
      (s) => s.featureId === featureId && s.orgId === orgId
    ) || null
  );
}

function saveSubscription(subscription) {
  const data = readData();
  data.subscriptions[subscription.subscriptionId] = subscription;
  writeData(data);
  return subscription;
}

module.exports = {
  readData,
  writeData,
  getFeature,
  saveFeature,
  getSubscription,
  saveSubscription,
};
