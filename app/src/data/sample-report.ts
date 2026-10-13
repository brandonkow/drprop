/**
 * The sample diagnosis report (brand/print, copied into assets/samples by
 * `npm run print -w @drprop/brand`), for the preview's sample record. The web
 * opens it in a new tab; phones hand it to the share sheet, which previews PDFs.
 */
import { Asset } from 'expo-asset';
import * as Sharing from 'expo-sharing';
import { Linking, Platform } from 'react-native';
import en from '../../assets/samples/diagnosis-en.pdf';
import type { Lang } from './types';

export async function openSampleReport(_lang: Lang, title: string): Promise<void> {
  const asset = Asset.fromModule(en);
  if (Platform.OS === 'web') {
    await Linking.openURL(asset.uri);
    return;
  }
  await asset.downloadAsync();
  await Sharing.shareAsync(asset.localUri ?? asset.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: title });
}
