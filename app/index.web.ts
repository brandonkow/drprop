// Web entry: Skia draws with CanvasKit (WASM), which must load before any
// screen renders. Route modules are evaluated at render time, so the static
// imports below are safe. Native platforms use index.ts.
import '@expo/metro-runtime';
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { App } from 'expo-router/build/qualified-entry';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';

LoadSkiaWeb({ locateFile: (file: string) => `/${file}` }).then(() => renderRootComponent(App));
