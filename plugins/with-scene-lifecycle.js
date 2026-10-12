// iOS 27 refuses to launch apps that don't adopt the UIScene life cycle.
// Expo SDK 57 ships `ExpoAppSceneDelegate` but its prebuild template still uses the
// app-delegate window. This switches the generated app over. Remove once on SDK 58,
// whose template does this itself.
const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

const WINDOW_BLOCK = /\n#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\([\s\S]*?\)\n#endif\n/;

function withSceneManifest(config) {
  return withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: 'EXExpoAppSceneDelegate',
          },
        ],
      },
    };
    return cfg;
  });
}

function withFactoryProvider(config) {
  return withAppDelegate(config, (cfg) => {
    if (cfg.modResults.language !== 'swift') {
      throw new Error('with-scene-lifecycle: expected a Swift AppDelegate');
    }
    let src = cfg.modResults.contents;
    if (!src.includes('ExpoReactNativeFactoryProvider')) {
      src = src.replace(
        'class AppDelegate: ExpoAppDelegate {',
        'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {',
      );
    }
    // The scene delegate creates the window and starts React Native in it.
    src = src.replace(WINDOW_BLOCK, '\n');
    if (!src.includes('ExpoReactNativeFactoryProvider') || src.includes('UIScreen.main.bounds')) {
      throw new Error('with-scene-lifecycle: AppDelegate template changed; update this plugin');
    }
    cfg.modResults.contents = src;
    return cfg;
  });
}

module.exports = (config) => withFactoryProvider(withSceneManifest(config));
