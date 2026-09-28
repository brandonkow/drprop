import React from 'react';
import { router } from 'expo-router';
import { Button, Copy, Screen } from '../components/ui';
export default function NotFound() { return <Screen title="A page out of place."><Copy>Return to the clinic to continue.</Copy><Button title="Return to Dr Prop" onPress={() => router.replace('/')} /></Screen>; }
