const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Inject EXPO_ROUTER_APP_ROOT into the environment
process.env.EXPO_ROUTER_APP_ROOT = 'app';

module.exports = config;
