const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push('sql');
config.resolver.assetExts.push('wasm');
// Local Android tooling caches contain thousands of directories unrelated to JS.
// Keep them out of Metro's Windows watcher while retaining its default exclusions.
const blockList = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(blockList) ? blockList : blockList ? [blockList] : []),
  /[/\\]\.expo[/\\](?:gradle-home|npm-cache|android-sdk|android-downloads)(?:[/\\]|$)/,
];
const enhanceMiddleware = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, metroServer) => {
  const enhanced = enhanceMiddleware ? enhanceMiddleware(middleware, metroServer) : middleware;
  return (request, response, next) => {
    // Required by expo-sqlite's web worker and SharedArrayBuffer.
    response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    response.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    return enhanced(request, response, next);
  };
};
module.exports = withNativeWind(config, { input: './global.css' });
