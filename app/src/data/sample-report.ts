/**
 * The sample diagnosis report (brand/print, copied into assets/samples by
 * `npm run print -w @drprop/brand`), for the preview's sample record. The web
 * opens it in a new tab; phones hand it to the share sheet, which previews PDFs.
 */
import { Asset } from 'expo-asset';
import * as Sharing from 'expo-sharing';
import { Linking, Platform } from 'react-native';
import en from '../../assets/samples/diagnosis-en.pdf';
import ms from '../../assets/samples/diagnosis-ms.pdf';
import zh from '../../assets/samples/diagnosis-zh.pdf';
import type { Lang } from './types';

const SAMPLES: Record<Lang, number> = { en, zh, ms };

export async function openSampleReport(lang: Lang, title: string): Promise<void> {
  const asset = Asset.fromModule(SAMPLES[lang]);
  if (Platform.OS === 'web') {
    await Linking.openURL(asset.uri);
    return;
  }
  await asset.downloadAsync();
  await Sharing.shareAsync(asset.localUri ?? asset.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: title });
}
