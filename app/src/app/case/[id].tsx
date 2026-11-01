import { router, useLocalSearchParams } from 'expo-router';
import { CaseWorkspace } from '../../components/case-workspace';
import { Body, Display } from '../../components/type';
import { Screen, TextLink } from '../../components/ui';
import { useApp } from '../../state/app-state';

export default function CaseScreen() {
  const {id}=useLocalSearchParams<{id:string}>(); const {user,mode}=useApp();
  return <Screen>
    <TextLink label="Back" onPress={()=>router.back()} />
    <Display>Private case.</Display>
    {mode==='connected' && user ? <CaseWorkspace key={`${user.id}:${id}`} id={id} userId={user.id} /> : <Body>Private document delivery requires a connected account. Preview records remain sample data.</Body>}
  </Screen>;
}
