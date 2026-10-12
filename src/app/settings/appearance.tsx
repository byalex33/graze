import { AppearanceSection } from '@/ui/appearance-section';
import { SettingsPage } from '@/ui/settings-kit';

export default function AppearanceSettings() {
  return (
    <SettingsPage
      title="Accent colour"
      intro="Colours the + button, switches and charts. Random picks a new one every time you open Graze."
    >
      <AppearanceSection />
    </SettingsPage>
  );
}
