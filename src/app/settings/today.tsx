import { SettingsPage } from '@/ui/settings-kit';
import { TodayLayoutSection } from '@/ui/today-layout-section';

export default function TodaySettings() {
  return (
    <SettingsPage title="Today screen" intro="What shows around your rings. The rings and your entries are always there.">
      <TodayLayoutSection />
    </SettingsPage>
  );
}
